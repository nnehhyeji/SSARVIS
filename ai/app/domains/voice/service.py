import base64
from typing import AsyncIterator

from fastapi import UploadFile

from app.domains.voice.exceptions import VoiceUpdateNotSupportedError
from app.domains.voice.schema import VoiceUpdateRequest
from app.infra.dashscope import DashScopeVoiceClient


class VoiceService:
    def __init__(
        self,
        dashscope_client: DashScopeVoiceClient,
    ) -> None:
        self.dashscope_client = dashscope_client

    async def create_voice(self, audio_file: UploadFile, audio_text: str) -> str:
        audio_payload = await audio_file.read()
        if not audio_payload:
            raise ValueError("audio file must not be empty")

        content_type = audio_file.content_type or "application/octet-stream"
        encoded = base64.b64encode(audio_payload).decode("utf-8")
        audio_data_uri = f"data:{content_type};base64,{encoded}"

        return await self.dashscope_client.create_voice_async(
            audio_uri=audio_data_uri,
            audio_text=audio_text,
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
