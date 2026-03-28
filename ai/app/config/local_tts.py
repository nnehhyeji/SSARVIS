from pydantic import computed_field
from pydantic_settings import BaseSettings

from app.config.base import SETTINGS_CONFIG


class LocalTtsConfig(BaseSettings):
    local_tts_base_url: str = ""
    local_tts_ws_url: str = ""
    local_tts_http_timeout_seconds: float = 3.0
    local_tts_speaker_id: int = 0
    local_tts_noise_scale: float = 0.667
    local_tts_noise_scale_w: float = 0.8
    local_tts_length_scale: float = 1.0

    model_config = SETTINGS_CONFIG

    @computed_field
    @property
    def local_tts_models_url(self) -> str:
        base_url = self.local_tts_base_url.rstrip("/")
        return f"{base_url}/models" if base_url else ""

    @computed_field
    @property
    def local_tts_effective_ws_url(self) -> str:
        if self.local_tts_ws_url.strip():
            return self.local_tts_ws_url.strip()

        base_url = self.local_tts_base_url.strip().rstrip("/")
        if base_url.startswith("http://"):
            return f"ws://{base_url.removeprefix('http://')}/ws/tts"
        if base_url.startswith("https://"):
            return f"wss://{base_url.removeprefix('https://')}/ws/tts"
        return ""


local_tts_config = LocalTtsConfig()
