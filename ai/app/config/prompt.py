from pydantic_settings import BaseSettings


class PromptConfig(BaseSettings):
    prompt_meta_file: str = "app/prompts/system_prompt_meta.md"

    model_config = {"env_file": ".env", "extra": "ignore"}


prompt_config = PromptConfig()
