import asyncio
import base64
import json
from io import BytesIO
import sys
import os
from pathlib import Path
import subprocess
import tempfile

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".." )))

from fastapi import UploadFile
from qdrant_client import QdrantClient
from starlette.datastructures import Headers
from websocket import create_connection

from app.domains.chat.schema import ChatRequest
from app.domains.chat.service import ChatService
from app.domains.voice.service import VoiceService


COMPOSE_FILE = "docker-compose.integration.yml"


def _assert_ffprobe_webm(audio_bytes: bytes) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        host_path = Path(temp_dir) / "chat-audio.webm"
        host_path.write_bytes(audio_bytes)

        container_id_result = subprocess.run(
            ["docker", "compose", "-f", COMPOSE_FILE, "ps", "-q", "ai"],
            check=True,
            capture_output=True,
            text=True,
        )
        container_id = container_id_result.stdout.strip()
        if not container_id:
            raise AssertionError("AI container is not running for ffprobe validation")

        container_path = "/tmp/chat-audio.webm"
        subprocess.run(
            ["docker", "cp", str(host_path), f"{container_id}:{container_path}"],
            check=True,
        )
        try:
            ffprobe_result = subprocess.run(
                [
                    "docker",
                    "exec",
                    container_id,
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "stream=codec_name,codec_type",
                    "-show_entries",
                    "format=format_name",
                    "-of",
                    "json",
                    container_path,
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            subprocess.run(
                [
                    "docker",
                    "exec",
                    container_id,
                    "ffmpeg",
                    "-v",
                    "error",
                    "-i",
                    container_path,
                    "-f",
                    "null",
                    "-",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
        finally:
            subprocess.run(
                ["docker", "exec", container_id, "rm", "-f", container_path],
                check=False,
                capture_output=True,
                text=True,
            )

    probe = json.loads(ffprobe_result.stdout)
    format_info = probe.get("format") or {}
    format_name = format_info.get("format_name", "")
    streams = probe.get("streams") or []

    assert "webm" in format_name
    assert any(
        stream.get("codec_type") == "audio" and stream.get("codec_name") == "opus"
        for stream in streams
    )


def _recv_chat_frames(websocket) -> list[dict]:
    events: list[dict] = []
    pending_voice_delta: dict | None = None
    pending_voice_end: dict | None = None

    while True:
        raw_message = websocket.recv()

        if isinstance(raw_message, str):
            event = json.loads(raw_message)
            if event["type"] == "voice.delta":
                pending_voice_delta = event
            elif event["type"] == "voice.end":
                pending_voice_end = event
                events.append(event)
            else:
                events.append(event)
            continue

        if isinstance(raw_message, (bytes, bytearray)):
            if pending_voice_delta is not None:
                pending_voice_delta["payload"]["data"] = bytes(raw_message)
                events.append(pending_voice_delta)
                pending_voice_delta = None
                continue
            if pending_voice_end is not None:
                pending_voice_end["payload"]["data"] = bytes(raw_message)
                break
            raise AssertionError("Received binary frame without voice metadata")

        raise AssertionError(f"Unexpected websocket frame: {type(raw_message)!r}")

    if pending_voice_delta is not None:
        raise AssertionError("voice.delta metadata was not followed by a binary frame")
    if pending_voice_end is not None and "data" not in pending_voice_end["payload"]:
        raise AssertionError("voice.end metadata was not followed by a binary frame")

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
        "isPublic": False,
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
        files={"audio": ("voice-upload.bin", audio_bytes, "application/octet-stream")},
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


def test_prompt_endpoint_updates_existing_system_prompt(http_client) -> None:
    response = http_client.post(
        "/api/v1/prompt",
        json={
            "systemPrompt": "차분하고 따뜻한 말투를 유지하며, 솔직하지만 공격적이지 않게 답한다.",
            "qna": [
                {"question": "요즘 말투는 어때?", "answer": "조금 더 장난스럽고 친근해."},
                {"question": "대화에서 중요한 건 뭐야?", "answer": "상대를 편하게 해주는 것."},
            ],
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["message"] == "시스템 프롬프트 생성 성공"
    assert isinstance(payload["data"]["systemPrompt"], str)
    assert payload["data"]["systemPrompt"].strip()


def test_chat_service_adds_public_conversation_guideline_when_is_public_true() -> None:
    class StubChatRepository:
        async def search_similar(self, **kwargs):
            return []

    class StubOpenAIClient:
        async def embed(self, text: str) -> list[float]:
            return [0.1, 0.2, 0.3]

    service = ChatService(
        chat_repository=StubChatRepository(),
        openai_client=StubOpenAIClient(),
        similar_conversations_prefix="similar prefix",
        response_guideline_prompt="response guideline",
        public_conversation_guideline_prompt=(
            "Do not reveal private or sensitive personal details in public settings."
        ),
    )

    preparation = asyncio.run(
        service.prepare_chat(
            ChatRequest(
                sessionId="public-session-1",
                userId=101,
                chatMode="NORMAL",
                memoryPolicy="GENERAL",
                isPublic=True,
                systemPrompt="친절한 친구처럼 대답해.",
                history=[],
                text="우리 집 주소 기억해?",
                voiceId="voice-id-123",
            )
        )
    )

    assert any(
        message["role"] == "system"
        and "Do not reveal private or sensitive personal details in public settings."
        in message["content"]
        for message in preparation.messages
    )


def test_chat_service_skips_public_conversation_guideline_when_is_public_false() -> None:
    class StubChatRepository:
        async def search_similar(self, **kwargs):
            return []

    class StubOpenAIClient:
        async def embed(self, text: str) -> list[float]:
            return [0.1, 0.2, 0.3]

    service = ChatService(
        chat_repository=StubChatRepository(),
        openai_client=StubOpenAIClient(),
        similar_conversations_prefix="similar prefix",
        response_guideline_prompt="response guideline",
        public_conversation_guideline_prompt=(
            "Do not reveal private or sensitive personal details in public settings."
        ),
    )

    preparation = asyncio.run(
        service.prepare_chat(
            ChatRequest(
                sessionId="private-session-1",
                userId=101,
                chatMode="NORMAL",
                memoryPolicy="GENERAL",
                isPublic=False,
                systemPrompt="친절한 친구처럼 대답해.",
                history=[],
                text="우리 집 주소 기억해?",
                voiceId="voice-id-123",
            )
        )
    )

    assert all(
        "Do not reveal private or sensitive personal details in public settings."
        not in message["content"]
        for message in preparation.messages
    )


def test_voice_endpoints_follow_new_contract(
    http_client,
    sample_voice_audio_bytes: bytes,
    sample_voice_text: str,
) -> None:
    class StubDashScopeVoiceClient:
        def __init__(self) -> None:
            self.calls: list[tuple[str, str]] = []

        async def create_voice_async(self, audio_uri: str, audio_text: str) -> str:
            self.calls.append((audio_uri, audio_text))
            return "voice-id-123"

    class StubAudioTranscoder:
        def __init__(self, result: bytes) -> None:
            self.result = result
            self.inputs: list[bytes] = []

        async def transcode_to_mp3(self, audio_data: bytes) -> bytes:
            self.inputs.append(audio_data)
            return self.result

    dashscope_client = StubDashScopeVoiceClient()
    transcoder = StubAudioTranscoder(result=b"fake-mp3")
    service = VoiceService(dashscope_client, transcoder)
    upload = UploadFile(
        file=BytesIO(b"raw-audio"),
        filename="voice-upload.bin",
        headers=Headers({"content-type": "application/octet-stream"}),
    )

    service_voice_id = asyncio.run(service.create_voice(upload, "sample text"))

    assert service_voice_id == "voice-id-123"
    assert transcoder.inputs == [b"raw-audio"]
    assert dashscope_client.calls == [
        (
            f"data:audio/mpeg;base64,{base64.b64encode(b'fake-mp3').decode('utf-8')}",
            "sample text",
        )
    ]

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

    voice_end_events = [
        event for event in third_general if event["type"] == "voice.end"
    ]
    assert len(voice_end_events) == 1
    assert voice_end_events[0]["payload"]["mimeType"] == "audio/webm"
    assert isinstance(voice_end_events[0]["payload"]["data"], bytes)
    assert voice_end_events[0]["payload"]["data"]
    _assert_ffprobe_webm(voice_end_events[0]["payload"]["data"])

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


def test_chat_websocket_accumulates_multiple_records_in_same_session(
    http_client,
    qdrant_client: QdrantClient,
    sample_voice_audio_bytes: bytes,
    sample_voice_text: str,
) -> None:
    voice_id = _create_voice(http_client, sample_voice_audio_bytes, sample_voice_text)

    first_chat = _run_chat(
        _chat_payload(
            session_id="session-repeat-1",
            user_id=101,
            chat_mode="NORMAL",
            memory_policy="GENERAL",
            text="첫 번째 메시지야.",
            voice_id=voice_id,
        )
    )
    second_chat = _run_chat(
        _chat_payload(
            session_id="session-repeat-1",
            user_id=101,
            chat_mode="NORMAL",
            memory_policy="GENERAL",
            text="같은 세션의 두 번째 메시지야.",
            voice_id=voice_id,
        )
    )

    assert first_chat[1]["type"] == "text.end"
    assert second_chat[1]["type"] == "text.end"
    assert first_chat[1]["payload"]["text"].strip()
    assert second_chat[1]["payload"]["text"].strip()

    records, _ = qdrant_client.scroll(
        collection_name="integration_chats",
        with_payload=True,
        with_vectors=False,
        limit=10,
    )
    payloads = [record.payload for record in records]

    same_session_payloads = [
        payload for payload in payloads if payload["session_id"] == "session-repeat-1"
    ]

    assert len(same_session_payloads) == 2
    assert {payload["text"] for payload in same_session_payloads} == {
        "첫 번째 메시지야.",
        "같은 세션의 두 번째 메시지야.",
    }

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
