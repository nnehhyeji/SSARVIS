from pydantic_settings import BaseSettings

from app.config.base import SETTINGS_CONFIG


class ChatConfig(BaseSettings):
    similar_conversations_limit: int = 1

    model_config = SETTINGS_CONFIG


chat_config = ChatConfig()
