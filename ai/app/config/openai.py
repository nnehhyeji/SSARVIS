from pydantic_settings import BaseSettings


class OpenAIConfig(BaseSettings):
    openai_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


openai_config = OpenAIConfig()
