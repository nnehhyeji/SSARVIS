import asyncio
import base64
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator
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

    async def synthesize(
        self,
        request: DashScopeSynthesisRequest,
    ) -> AsyncIterator[bytes]:
        queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        loop = asyncio.get_running_loop()
        done_event = asyncio.Event()
        error_holder: dict[str, Exception] = {}

        tts_task = loop.run_in_executor(
            None,
            self._run_synthesis_session,
            request,
            loop,
            queue,
            done_event,
            error_holder,
        )

        while True:
            chunk = await queue.get()
            if chunk is None:
                await tts_task
                if "error" in error_holder:
                    raise error_holder["error"]
                break
            yield chunk

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

    def _run_synthesis_session(
        self,
        request: DashScopeSynthesisRequest,
        loop: asyncio.AbstractEventLoop,
        queue: asyncio.Queue[bytes | None],
        done_event: asyncio.Event,
        error_holder: dict[str, Exception],
    ) -> None:
        import time

        import dashscope
        from dashscope.audio.qwen_tts_realtime import (
            AudioFormat,
            QwenTtsRealtime,
            QwenTtsRealtimeCallback,
        )

        def finish_stream() -> None:
            if done_event.is_set():
                return
            done_event.set()
            loop.call_soon_threadsafe(queue.put_nowait, None)

        class Callback(QwenTtsRealtimeCallback):
            def on_open(self) -> None:
                return None

            def on_close(self, close_status_code, close_msg) -> None:
                finish_stream()

            def on_event(self, response: dict[str, Any]) -> None:
                self_outer._handle_realtime_event(
                    response=response,
                    loop=loop,
                    queue=queue,
                    finish_stream=finish_stream,
                    error_holder=error_holder,
                )

        self_outer = self
        dashscope.api_key = dashscope_config.dashscope_api_key
        callback = Callback()
        tts = QwenTtsRealtime(
            model=request.model,
            callback=callback,
            url=request.url,
        )

        try:
            tts.connect()
            tts.update_session(
                voice=request.voice_id,
                response_format=self._resolve_audio_format(
                    AudioFormat,
                    request.response_format,
                ),
                mode=request.mode,
            )
            tts.append_text(request.text)
            time.sleep(0.1)
            tts.finish()
        except Exception as exc:
            error_holder["error"] = RuntimeError(f"TTS runtime failed: {exc}")
            finish_stream()

    def _handle_realtime_event(
        self,
        response: dict[str, Any],
        loop: asyncio.AbstractEventLoop,
        queue: asyncio.Queue[bytes | None],
        finish_stream,
        error_holder: dict[str, Exception],
    ) -> None:
        event_type = response.get("type", "")

        if event_type == "response.audio.delta":
            delta = response.get("delta")
            if not delta:
                return
            try:
                audio_data = base64.b64decode(delta, validate=True)
            except Exception as exc:
                error_holder["error"] = RuntimeError(
                    f"Invalid audio delta payload: {exc}"
                )
                finish_stream()
                return
            loop.call_soon_threadsafe(queue.put_nowait, audio_data)
            return

        if event_type == "session.finished":
            finish_stream()
            return

        if event_type.startswith("error"):
            error_holder["error"] = RuntimeError(
                f"DashScope realtime error: {response}"
            )
            finish_stream()

    @staticmethod
    def _resolve_audio_format(audio_format_type: Any, value: str) -> Any:
        try:
            return getattr(audio_format_type, value)
        except AttributeError as exc:
            raise ValueError(f"Unsupported DashScope audio format: {value}") from exc

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
