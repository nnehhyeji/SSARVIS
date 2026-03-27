from pydantic import field_validator
from pydantic_settings import BaseSettings

from app.config.base import SETTINGS_CONFIG


class MediaConfig(BaseSettings):
    opus_dll_directory: str = ""
    opus_sample_rate: int = 24000
    opus_channels: int = 1
    opus_frame_duration_ms: int = 40
    opus_bitrate: int = 24000
    audio_tempo: float = 1.0

    model_config = SETTINGS_CONFIG

    @field_validator("audio_tempo")
    @classmethod
    def validate_audio_tempo(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("audio_tempo must be greater than 0")
        return value

    def build_atempo_filter(self) -> str:
        remaining = self.audio_tempo
        filters: list[str] = []

        while remaining > 2.0:
            filters.append("atempo=2.0")
            remaining /= 2.0

        while remaining < 0.5:
            filters.append("atempo=0.5")
            remaining /= 0.5

        filters.append(f"atempo={remaining:.6f}".rstrip("0").rstrip("."))
        return ",".join(filters)


media_config = MediaConfig()
