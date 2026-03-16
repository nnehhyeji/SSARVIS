from pydantic_settings import BaseSettings


class MediaConfig(BaseSettings):
    opus_sample_rate: int = 24000
    opus_channels: int = 1

    model_config = {"env_file": ".env", "extra": "ignore"}


media_config = MediaConfig()
