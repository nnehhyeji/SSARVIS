from pydantic_settings import BaseSettings


class DashScopeConfig(BaseSettings):
    dashscope_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


dashscope_config = DashScopeConfig()
