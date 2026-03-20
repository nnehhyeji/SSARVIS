from pydantic_settings import BaseSettings

from app.config.base import SETTINGS_CONFIG


class OpenAIConfig(BaseSettings):
    openai_base_url: str = "https://gms.ssafy.io/gmsapi/api.openai.com/v1"
    openai_api_key: str = ""
    llm_model: str = "gpt-5.4-mini"
    llm_timeout_seconds: float = 30.0
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    model_config = SETTINGS_CONFIG


openai_config = OpenAIConfig()
