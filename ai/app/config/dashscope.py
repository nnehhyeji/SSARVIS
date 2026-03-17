from pydantic_settings import BaseSettings


class DashScopeConfig(BaseSettings):
    dashscope_api_key: str = ""
    tts_model: str = "qwen3-tts-vc-realtime-2026-01-15"
    tts_voice_enrollment_model: str = "qwen-voice-enrollment"
    tts_audio_mime_type: str = "audio/mpeg"
    tts_enrollment_url: str = "https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/customization"
    tts_http_timeout_seconds: float = 20.0

    model_config = {"env_file": ".env", "extra": "ignore"}


dashscope_config = DashScopeConfig()
