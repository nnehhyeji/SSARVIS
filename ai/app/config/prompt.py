from pydantic_settings import BaseSettings

from app.config.base import SETTINGS_CONFIG


class PromptConfig(BaseSettings):
    prompt_meta_file: str = "app/prompts/system_prompt_meta.md"
    prompt_update_meta_file: str = "app/prompts/system_prompt_meta_update.md"

    model_config = SETTINGS_CONFIG


prompt_config = PromptConfig()
