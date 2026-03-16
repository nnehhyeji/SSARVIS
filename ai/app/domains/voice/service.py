from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from app.domains.voice.model import Voice
from app.domains.voice.repository import VoiceRepository
from app.domains.voice.schema import VoiceCreateItem


class VoiceService:
    def __init__(self, repository: VoiceRepository) -> None:
        self.repository = repository

    def create_voices(self, user_id: str, items: list[VoiceCreateItem]) -> list[Voice]:
        voices: list[Voice] = []
        for item in items:
            voice = Voice.create(
                user_id=user_id,
                voice_id=str(uuid4()),
                file_name=self._resolve_file_name(item.audio_uri),
                audio_text=item.audio_text,
            )
            voices.append(self.repository.create(voice))
        return voices

    def list_voices(self, user_id: str) -> list[Voice]:
        return self.repository.list_by_user_id(user_id)

    def delete_voice(self, user_id: str, voice_id: str) -> bool:
        return self.repository.delete(user_id, voice_id)

    @staticmethod
    def _resolve_file_name(audio_uri: str) -> str:
        if audio_uri.startswith("data:"):
            return "voice_upload"

        parsed = urlparse(audio_uri)
        name = Path(parsed.path).name
        return name or "voice_upload"
