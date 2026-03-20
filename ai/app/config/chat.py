from pydantic_settings import BaseSettings


class ChatConfig(BaseSettings):
    similar_conversations_limit: int = 1
    similar_conversations_prefix_file: str = "app/prompts/similar_conversations_prefix.md"
    response_guideline_prompt_file: str = "app/prompts/response_guideline.md"

    model_config = {"env_file": ".env", "extra": "ignore"}


chat_config = ChatConfig()
