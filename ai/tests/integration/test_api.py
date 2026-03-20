import json

from qdrant_client import QdrantClient
from websocket import create_connection


def _recv_chat_frames(websocket) -> list[dict]:
    events: list[dict] = []
    pending_voice_delta: dict | None = None

    while True:
        raw_message = websocket.recv()

        if isinstance(raw_message, str):
            event = json.loads(raw_message)
            if event["type"] == "voice.delta":
                pending_voice_delta = event
            else:
                events.append(event)
                if event["type"] == "voice.end":
                    break
            continue

        if isinstance(raw_message, (bytes, bytearray)):
            if pending_voice_delta is None:
                raise AssertionError("Received binary frame without voice.delta metadata")
            pending_voice_delta["payload"]["data"] = bytes(raw_message)
            events.append(pending_voice_delta)
            pending_voice_delta = None
            continue

        raise AssertionError(f"Unexpected websocket frame: {type(raw_message)!r}")

    if pending_voice_delta is not None:
        raise AssertionError("voice.delta metadata was not followed by a binary frame")

    return events


def _chat_payload(
    *,
    session_id: str,
    user_id: int,
    chat_mode: str,
    memory_policy: str,
    text: str,
    voice_id: str,
) -> dict:
    return {
        "sessionId": session_id,
        "userId": user_id,
        "chatMode": chat_mode,
        "memoryPolicy": memory_policy,
        "systemPrompt": "친절한 친구처럼 대답해.",
        "history": [],
        "text": text,
        "voiceId": voice_id,
    }


def _run_chat(payload: dict) -> list[dict]:
    websocket = create_connection("ws://127.0.0.1:18000/api/v1/chat", timeout=120)
    try:
        websocket.send(json.dumps(payload, ensure_ascii=False))
        return _recv_chat_frames(websocket)
    finally:
        websocket.close()


def _run_chat_until_close(payload: dict) -> list[dict]:
    websocket = create_connection("ws://127.0.0.1:18000/api/v1/chat", timeout=120)
    try:
        websocket.send(json.dumps(payload, ensure_ascii=False))
        events: list[dict] = []
        while True:
            try:
                raw_message = websocket.recv()
            except Exception:
                break
            if not raw_message:
                break
            if not isinstance(raw_message, str):
                raise AssertionError(f"Unexpected binary frame: {type(raw_message)!r}")
            events.append(json.loads(raw_message))
        return events
    finally:
        websocket.close()


def _create_voice(http_client, audio_bytes: bytes, audio_text: str) -> str:
    response = http_client.post(
        "/api/v1/voice",
        data={"audioText": audio_text},
        files={"audio": ("voice.wav", audio_bytes, "audio/wav")},
    )
    response.raise_for_status()
    return response.json()["data"]["voiceId"]


def test_prompt_endpoint_generates_system_prompt(http_client) -> None:
    response = http_client.post(
        "/api/v1/prompt",
        json={
            "qna": [
                {"question": "어떤 사람 같아?", "answer": "차분하고 유머가 있어."},
                {"question": "말투는 어때?", "answer": "부드럽고 솔직해."},
            ]
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["message"] == "시스템 프롬프트 생성 성공"
    assert isinstance(payload["data"]["systemPrompt"], str)
    assert payload["data"]["systemPrompt"].strip()


def test_voice_endpoints_follow_new_contract(
    http_client,
    sample_voice_audio_bytes: bytes,
    sample_voice_text: str,
) -> None:
    voice_id = _create_voice(http_client, sample_voice_audio_bytes, sample_voice_text)
    assert isinstance(voice_id, str)
    assert voice_id.strip()

    updated = http_client.put(
        "/api/v1/voice",
        json={
            "voiceId": voice_id,
            "audioUrl": "https://example.com/voice.wav",
            "audioText": sample_voice_text,
        },
    )
    assert updated.status_code == 501
    assert "does not support updating" in updated.json()["detail"]

    deleted = http_client.request(
        "DELETE",
        "/api/v1/voice",
        json={"voiceId": voice_id},
    )
    assert deleted.status_code == 200
    assert deleted.json() == {"message": "음성 삭제 성공", "data": {}}


def test_chat_websocket_persists_records_in_qdrant(
    http_client,
    qdrant_client: QdrantClient,
    sample_voice_audio_bytes: bytes,
    sample_voice_text: str,
) -> None:
    voice_id = _create_voice(http_client, sample_voice_audio_bytes, sample_voice_text)

    first_general = _run_chat(
        _chat_payload(
            session_id="session-general-1",
            user_id=101,
            chat_mode="NORMAL",
            memory_policy="GENERAL",
            text="안녕, 오늘 기분 어때?",
            voice_id=voice_id,
        )
    )
    second_secret = _run_chat(
        _chat_payload(
            session_id="session-secret-1",
            user_id=101,
            chat_mode="NORMAL",
            memory_policy="SECRET",
            text="오늘 있었던 비밀 얘기야.",
            voice_id=voice_id,
        )
    )
    third_general = _run_chat(
        _chat_payload(
            session_id="session-general-2",
            user_id=101,
            chat_mode="NORMAL",
            memory_policy="GENERAL",
            text="방금 이야기 이어서 해줘.",
            voice_id=voice_id,
        )
    )

    assert [event["type"] for event in first_general[:3]] == [
        "text.start",
        "text.end",
        "voice.start",
    ]
    assert all(event["sessionId"] == "session-general-1" for event in first_general)
    assert all(event["sessionId"] == "session-secret-1" for event in second_secret)
    assert all(event["sessionId"] == "session-general-2" for event in third_general)
    assert first_general[1]["payload"]["text"].strip()
    assert second_secret[1]["payload"]["text"].strip()
    assert third_general[1]["payload"]["text"].strip()

    voice_delta_events = [
        event for event in third_general if event["type"] == "voice.delta"
    ]
    assert voice_delta_events
    assert all(event["payload"]["mimeType"] == "audio/webm" for event in voice_delta_events)
    assert all(isinstance(event["payload"]["data"], bytes) for event in voice_delta_events)
    assert all(event["payload"]["data"] for event in voice_delta_events)

    records, _ = qdrant_client.scroll(
        collection_name="integration_chats",
        with_payload=True,
        with_vectors=False,
        limit=10,
    )
    payloads = [record.payload for record in records]

    assert len(payloads) == 3
    assert {payload["session_id"] for payload in payloads} == {
        "session-general-1",
        "session-secret-1",
        "session-general-2",
    }
    assert sum(1 for payload in payloads if payload["memory_policy"] == "GENERAL") == 2
    assert sum(1 for payload in payloads if payload["memory_policy"] == "SECRET") == 1
    assert all(payload["response"].strip() for payload in payloads)

    deleted = http_client.request(
        "DELETE",
        "/api/v1/voice",
        json={"voiceId": voice_id},
    )
    assert deleted.status_code == 200


def test_chat_websocket_rejects_invalid_request(http_client) -> None:
    events = _run_chat_until_close(
        {
            "sessionId": "   ",
            "userId": 101,
            "chatMode": "NORMAL",
            "memoryPolicy": "GENERAL",
            "systemPrompt": "",
            "history": [{"role": "developer", "content": "금지된 role"}],
            "text": "   ",
            "voiceId": "",
        }
    )

    assert len(events) == 1
    assert events[0]["type"] == "error"
    assert events[0]["detail"] == "Invalid chat request"
    assert events[0]["payload"]["code"] == "invalid_request"
    assert len(events[0]["payload"]["errors"]) >= 4
