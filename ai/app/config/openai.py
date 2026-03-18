from pydantic_settings import BaseSettings


class OpenAIConfig(BaseSettings):
    openai_api_key: str = ""
    llm_model: str = "gpt-5-mini"
    llm_timeout_seconds: float = 30.0
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    model_config = {"env_file": ".env", "extra": "ignore"}


openai_config = OpenAIConfig()
