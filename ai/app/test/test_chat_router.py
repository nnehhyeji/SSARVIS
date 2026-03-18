import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.domains.chat.router import (
    get_chat_service,
    get_tts_storage_service,
    get_voice_service,
    router,
)
from app.domains.chat.service import ChatPreparation
from app.domains.chat.schema import ChatContext


class _StubChatService:
    def __init__(self) -> None:
        self.openai_client = SimpleNamespace(generate=self._generate)
        self.chat_repository = SimpleNamespace(
            create=self._create,
            set_tts_asset=self._set_tts_asset,
        )
        self.qdrant_client = SimpleNamespace(upsert=self._upsert)
        self.created_messages: list[tuple[str, str, str]] = []
        self.tts_assets: list[tuple[int, str, str]] = []

    async def prepare_chat(self, user_id: str, user_message: str) -> ChatPreparation:
        return ChatPreparation(
            context=ChatContext(system_prompt="prompt", user_message=user_message),
            messages=[{"role": "user", "content": user_message}],
            query_vector=[0.1, 0.2],
        )

    async def _generate(self, messages):
        return "안녕하세요"

    async def _create(self, user_id: str, user_message: str, assistant_message: str):
        self.created_messages.append((user_id, user_message, assistant_message))
        return SimpleNamespace(id=1)

    async def _set_tts_asset(self, conversation_id: int, file_name: str, s3_object_key: str):
        self.tts_assets.append((conversation_id, file_name, s3_object_key))
        return SimpleNamespace(id=conversation_id)

    async def _upsert(self, point_id, vector, payload):
        return None

    @staticmethod
    def sanitize_tts_text(text: str) -> str:
        return text


class _StubVoiceService:
    def __init__(self, valid_voice: bool = True) -> None:
        self.repository = SimpleNamespace(get_by_voice_id=self._get_by_voice_id)
        self.valid_voice = valid_voice

    async def _get_by_voice_id(self, user_id: str, voice_id: str):
        if not self.valid_voice:
            return None
        return SimpleNamespace(voice_id=voice_id)

    async def synthesize(self, text: str, voice_id: str):
        yield b"pcm-chunk"


class _StubTTSStorageService:
    async def upload_pcm_as_mp3(self, user_id: str, conversation_id: int, pcm_data: bytes):
        return SimpleNamespace(
            file_name="tts_1.mp3",
            object_key="tts/user-1/tts_1.mp3",
            download_url="https://example.com/tts_1.mp3",
        )


class _StubOpusEncoder:
    def encode(self, pcm_data: bytes) -> list[bytes]:
        return [b"opus-packet"]

    def flush(self) -> list[bytes]:
        return []


class ChatRouterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = FastAPI()
        self.app.include_router(router, prefix="/api")
        self.client = TestClient(self.app)
        self.addCleanup(self.client.close)
        self.addCleanup(self.app.dependency_overrides.clear)

    def test_chat_websocket_streams_text_audio_and_done(self) -> None:
        chat_service = _StubChatService()
        self.app.dependency_overrides[get_chat_service] = lambda: chat_service
        self.app.dependency_overrides[get_voice_service] = lambda: _StubVoiceService()
        self.app.dependency_overrides[get_tts_storage_service] = lambda: _StubTTSStorageService()

        with patch("app.domains.chat.router.OpusEncoder", return_value=_StubOpusEncoder()):
            with self.client.websocket_connect("/api/chat?user_id=user-1") as websocket:
                websocket.send_text(json.dumps({"message": "안녕", "voice_id": "voice-1"}))

                text_event = json.loads(websocket.receive_text())
                audio_packet = websocket.receive_bytes()
                done_event = json.loads(websocket.receive_text())

        self.assertEqual(text_event, {"type": "text", "content": "안녕하세요"})
        self.assertEqual(audio_packet, b"opus-packet")
        self.assertEqual(
            done_event,
            {"type": "done", "audio_download_url": "https://example.com/tts_1.mp3"},
        )
        self.assertEqual(chat_service.created_messages, [("user-1", "안녕", "안녕하세요")])
        self.assertEqual(
            chat_service.tts_assets,
            [(1, "tts_1.mp3", "tts/user-1/tts_1.mp3")],
        )

    def test_chat_websocket_rejects_invalid_voice(self) -> None:
        self.app.dependency_overrides[get_chat_service] = lambda: _StubChatService()
        self.app.dependency_overrides[get_voice_service] = lambda: _StubVoiceService(
            valid_voice=False
        )
        self.app.dependency_overrides[get_tts_storage_service] = lambda: _StubTTSStorageService()

        with self.client.websocket_connect("/api/chat?user_id=user-1") as websocket:
            websocket.send_text(json.dumps({"message": "안녕", "voice_id": "voice-1"}))
            error_event = json.loads(websocket.receive_text())

        self.assertEqual(
            error_event,
            {
                "type": "error",
                "detail": "Invalid voice_id or voice does not belong to this user",
            },
        )


if __name__ == "__main__":
    unittest.main()
