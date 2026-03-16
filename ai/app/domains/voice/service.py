from app.domains.voice.model import Voice
from app.domains.voice.exceptions import VoiceNotFoundError
from app.domains.voice.repository import VoiceRepository
from app.domains.voice.schema import VoiceCreateItem
from app.infra.dashscope import DashScopeVoiceClient


class VoiceService:
    def __init__(
        self,
        repository: VoiceRepository,
        dashscope_client: DashScopeVoiceClient,
    ) -> None:
        self.repository = repository
        self.dashscope_client = dashscope_client

    async def create_voices(self, user_id: str, items: list[VoiceCreateItem]) -> list[Voice]:
        voices: list[Voice] = []
        for item in items:
            voice_id = await self.dashscope_client.create_voice_async(
                audio_uri=item.audio_uri,
                audio_text=item.audio_text,
            )
            voice = Voice.create(
                user_id=user_id,
                voice_id=voice_id,
                file_name=self.dashscope_client.resolve_file_name(item.audio_uri),
                audio_text=item.audio_text,
            )
            voices.append(self.repository.create(voice))
        return voices

    def list_voices(self, user_id: str) -> list[Voice]:
        return self.repository.list_by_user_id(user_id)

    async def delete_voice(self, user_id: str, voice_id: str) -> None:
        existing = self.repository.get_by_voice_id(user_id, voice_id)
        if existing is None:
            raise VoiceNotFoundError("Voice not found")
        await self.dashscope_client.delete_voice_async(voice_id)
        self.repository.delete(user_id, voice_id)
