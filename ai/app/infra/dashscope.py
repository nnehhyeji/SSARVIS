import asyncio
import base64
import json
from dataclasses import dataclass
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from app.config.dashscope import dashscope_config


@dataclass(frozen=True)
class DashScopeSynthesisRequest:
    text: str
    voice_id: str
    model: str
    url: str
    response_format: str = "PCM_24000HZ_MONO_16BIT"
    mode: str = "server_commit"


class DashScopeVoiceClient:
    def create_voice(self, audio_uri: str, audio_text: str) -> str:
        payload = {
            "model": dashscope_config.tts_voice_enrollment_model,
            "input": {
                "action": "create",
                "target_model": dashscope_config.tts_model,
                "preferred_name": "user_voice",
                "audio": {"data": self._resolve_audio_data_uri(audio_uri)},
                "text": audio_text,
            },
        }
        response = self._post(payload)
        try:
            return response["output"]["voice"]
        except KeyError as exc:
            raise RuntimeError("DashScope response did not include a voice id") from exc

    def delete_voice(self, voice_id: str) -> None:
        payload = {
            "model": dashscope_config.tts_voice_enrollment_model,
            "input": {
                "action": "delete",
                "voice": voice_id,
            },
        }
        self._post(payload)

    async def create_voice_async(self, audio_uri: str, audio_text: str) -> str:
        return await asyncio.to_thread(self.create_voice, audio_uri, audio_text)

    async def delete_voice_async(self, voice_id: str) -> None:
        await asyncio.to_thread(self.delete_voice, voice_id)

    def create_synthesis_request(
        self,
        text: str,
        voice_id: str,
    ) -> DashScopeSynthesisRequest:
        normalized_text = text.strip()
        normalized_voice_id = voice_id.strip()

        if not normalized_text:
            raise ValueError("text must not be blank")
        if not normalized_voice_id:
            raise ValueError("voice_id must not be blank")

        return DashScopeSynthesisRequest(
            text=normalized_text,
            voice_id=normalized_voice_id,
            model=dashscope_config.tts_model,
            url=dashscope_config.tts_ws_url,
        )

    def _post(self, payload: dict) -> dict:
        body = json.dumps(payload).encode("utf-8")
        request = Request(
            dashscope_config.tts_enrollment_url,
            data=body,
            headers={
                "Authorization": f"Bearer {dashscope_config.dashscope_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=dashscope_config.tts_http_timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"DashScope request failed: {exc.code} {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"DashScope connection failed: {exc.reason}") from exc

    def _resolve_audio_data_uri(self, audio_uri: str) -> str:
        if audio_uri.startswith("data:"):
            return audio_uri

        if audio_uri.startswith("https://"):
            return self._download_as_data_uri(audio_uri)

        raise ValueError("audio_uri must start with data: or https://")

    def _download_as_data_uri(self, audio_uri: str) -> str:
        request = Request(audio_uri, method="GET")
        try:
            with urlopen(request, timeout=dashscope_config.tts_http_timeout_seconds) as response:
                content_type = response.headers.get_content_type() or "application/octet-stream"
                payload = base64.b64encode(response.read()).decode("utf-8")
        except HTTPError as exc:
            raise RuntimeError(f"Failed to download voice source: {exc.code}") from exc
        except URLError as exc:
            raise RuntimeError(f"Failed to download voice source: {exc.reason}") from exc
        return f"data:{content_type};base64,{payload}"

    @staticmethod
    def resolve_file_name(audio_uri: str) -> str:
        if audio_uri.startswith("data:"):
            return "voice_upload"

        parsed = urlparse(audio_uri)
        name = Path(parsed.path).name
        return name or "voice_upload"
