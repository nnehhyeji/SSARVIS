import asyncio
import json
import logging
import socket
from collections.abc import AsyncIterator
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from websockets.asyncio.client import connect

from app.config.local_tts import local_tts_config


logger = logging.getLogger(__name__)


class LocalTtsClient:
    def __init__(self) -> None:
        self._model_ids: set[str] = set()
        self._models_loaded = False
        self._lock = asyncio.Lock()

    async def preload_models(self) -> None:
        if not self.is_enabled():
            return

        try:
            await self.refresh_models(force=True)
        except Exception:
            logger.exception("Failed to preload local TTS models")

    def is_enabled(self) -> bool:
        return bool(local_tts_config.local_tts_models_url)

    async def refresh_models(self, *, force: bool = False) -> set[str]:
        if not self.is_enabled():
            self._model_ids = set()
            self._models_loaded = False
            return set()

        if self._models_loaded and not force:
            return set(self._model_ids)

        async with self._lock:
            if self._models_loaded and not force:
                return set(self._model_ids)

            try:
                models = await asyncio.to_thread(self._fetch_models)
            except (TimeoutError, socket.timeout):
                logger.warning(
                    "Local TTS /models timed out after %.1fs; skipping local TTS",
                    local_tts_config.local_tts_http_timeout_seconds,
                )
                models = []
            self._model_ids = set(models)
            self._models_loaded = True
            return set(self._model_ids)

    async def is_model_voice_id(self, voice_id: str) -> bool:
        normalized_voice_id = voice_id.strip()
        if not normalized_voice_id or not self.is_enabled():
            return False

        if normalized_voice_id in self._model_ids:
            return True

        await self.refresh_models(force=not self._models_loaded)
        if normalized_voice_id in self._model_ids:
            return True

        refreshed_models = await self.refresh_models(force=True)
        return normalized_voice_id in refreshed_models

    async def synthesize(self, text: str, model_id: str) -> AsyncIterator[bytes]:
        normalized_text = text.strip()
        normalized_model_id = model_id.strip()
        if not normalized_text:
            raise ValueError("text must not be blank")
        if not normalized_model_id:
            raise ValueError("model_id must not be blank")

        payload = {
            "modelId": normalized_model_id,
            "text": normalized_text,
            "speakerId": local_tts_config.local_tts_speaker_id,
            "noiseScale": local_tts_config.local_tts_noise_scale,
            "noiseScaleW": local_tts_config.local_tts_noise_scale_w,
            "lengthScale": local_tts_config.local_tts_length_scale,
        }

        ws_url = local_tts_config.local_tts_effective_ws_url
        if not ws_url:
            raise RuntimeError("LOCAL_TTS_WS_URL or LOCAL_TTS_BASE_URL is not configured")

        async with connect(ws_url) as websocket:
            await websocket.send(json.dumps(payload, ensure_ascii=False))

            while True:
                message = await websocket.recv()
                if isinstance(message, bytes):
                    yield message
                    continue

                event = json.loads(message)
                event_name = event.get("event", "")
                if event_name == "start":
                    continue
                if event_name == "end":
                    break
                if event_name == "error":
                    raise RuntimeError(event.get("message", "Local TTS synthesis failed"))

                raise RuntimeError(f"Unexpected local TTS event: {event}")

    def _fetch_models(self) -> list[str]:
        request = Request(local_tts_config.local_tts_models_url, method="GET")
        try:
            with urlopen(
                request,
                timeout=local_tts_config.local_tts_http_timeout_seconds,
            ) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except TimeoutError:
            logger.warning(
                "Local TTS /models timed out after %.1fs; skipping local TTS",
                local_tts_config.local_tts_http_timeout_seconds,
            )
            return []
        except socket.timeout:
            logger.warning(
                "Local TTS /models timed out after %.1fs; skipping local TTS",
                local_tts_config.local_tts_http_timeout_seconds,
            )
            return []
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(
                f"Local TTS models request failed: {exc.code} {detail}"
            ) from exc
        except URLError as exc:
            if isinstance(exc.reason, (TimeoutError, socket.timeout)):
                logger.warning(
                    "Local TTS /models timed out after %.1fs; skipping local TTS",
                    local_tts_config.local_tts_http_timeout_seconds,
                )
                return []
            raise RuntimeError(
                f"Local TTS models connection failed: {exc.reason}"
            ) from exc

        models = payload.get("models")
        if not isinstance(models, list):
            raise RuntimeError("Local TTS models response did not include a models list")

        return [str(model).strip() for model in models if str(model).strip()]


local_tts_client = LocalTtsClient()
