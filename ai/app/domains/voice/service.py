from typing import AsyncIterator

from app.domains.voice.exceptions import VoiceUpdateNotSupportedError
from app.domains.voice.schema import VoiceCreateRequest, VoiceUpdateRequest
from app.infra.dashscope import DashScopeVoiceClient


class VoiceService:
    def __init__(
        self,
        dashscope_client: DashScopeVoiceClient,
    ) -> None:
        self.dashscope_client = dashscope_client

    async def create_voice(self, body: VoiceCreateRequest) -> str:
        return await self.dashscope_client.create_voice_async(
            audio_uri=body.audioUrl,
            audio_text=body.audioText,
        )

    async def update_voice(self, body: VoiceUpdateRequest) -> None:
        raise VoiceUpdateNotSupportedError(
            "DashScope does not support updating an enrolled voice in place"
        )

    async def delete_voice(self, voice_id: str) -> None:
        await self.dashscope_client.delete_voice_async(voice_id)

    async def synthesize(self, text: str, voice_id: str) -> AsyncIterator[bytes]:
        request = self.dashscope_client.create_synthesis_request(
            text=text,
            voice_id=voice_id,
        )
        async for chunk in self.dashscope_client.synthesize(request):
            yield chunk
