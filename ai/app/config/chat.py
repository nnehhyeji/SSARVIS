from pydantic_settings import BaseSettings

from app.config.base import SETTINGS_CONFIG


class ChatConfig(BaseSettings):
    similar_conversations_limit: int = 1
    similar_conversations_prefix_file: str = "app/prompts/similar_conversations_prefix.md"
    response_guideline_prompt_file: str = "app/prompts/response_guideline.md"

    model_config = SETTINGS_CONFIG


chat_config = ChatConfig()
