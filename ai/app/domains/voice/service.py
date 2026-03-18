from datetime import datetime, timezone
from typing import AsyncIterator

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
                created_at=datetime.now(timezone.utc),
            )
            voices.append(await self.repository.create(voice))
        return voices

    async def list_voices(self, user_id: str) -> list[Voice]:
        return await self.repository.list_by_user_id(user_id)

    async def delete_voice(self, user_id: str, voice_id: str) -> None:
        existing = await self.repository.get_by_voice_id(user_id, voice_id)
        if existing is None:
            raise VoiceNotFoundError("Voice not found")
        await self.dashscope_client.delete_voice_async(voice_id)
        await self.repository.delete(user_id, voice_id)

    async def synthesize(self, text: str, voice_id: str) -> AsyncIterator[bytes]:
        request = self.dashscope_client.create_synthesis_request(
            text=text,
            voice_id=voice_id,
        )
        async for chunk in self.dashscope_client.synthesize(request):
            yield chunk
