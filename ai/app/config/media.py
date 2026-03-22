from pydantic_settings import BaseSettings

from app.config.base import SETTINGS_CONFIG


class MediaConfig(BaseSettings):
    opus_dll_directory: str = ""
    opus_sample_rate: int = 24000
    opus_channels: int = 1
    opus_frame_duration_ms: int = 40
    opus_bitrate: int = 24000

    model_config = SETTINGS_CONFIG


media_config = MediaConfig()
