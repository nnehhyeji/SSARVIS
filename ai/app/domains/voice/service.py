import base64
from typing import AsyncIterator

from fastapi import UploadFile

from app.domains.voice.exceptions import VoiceUpdateNotSupportedError
from app.domains.voice.schema import VoiceUpdateRequest
from app.infra.audio_transcoder import AudioTranscoder
from app.infra.dashscope import DashScopeVoiceClient


class VoiceService:
    def __init__(
        self,
        dashscope_client: DashScopeVoiceClient,
        audio_transcoder: AudioTranscoder,
    ) -> None:
        self.dashscope_client = dashscope_client
        self.audio_transcoder = audio_transcoder

    async def create_voice(self, audio_file: UploadFile, audio_text: str) -> str:
        audio_payload = await audio_file.read()
        mp3_payload = await self.audio_transcoder.transcode_to_mp3(audio_payload)
        encoded = base64.b64encode(mp3_payload).decode("utf-8")
        audio_data_uri = f"data:audio/mpeg;base64,{encoded}"

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
