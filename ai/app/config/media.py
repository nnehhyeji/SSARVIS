from pydantic_settings import BaseSettings


class MediaConfig(BaseSettings):
    opus_dll_directory: str = ""
    opus_sample_rate: int = 24000
    opus_channels: int = 1
    opus_frame_duration_ms: int = 40
    opus_bitrate: int = 24000

    model_config = {"env_file": ".env", "extra": "ignore"}


media_config = MediaConfig()
