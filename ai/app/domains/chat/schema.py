from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    voice_id: str


class ConversationContextItem(BaseModel):
    user_message: str
    assistant_message: str


class ChatContext(BaseModel):
    system_prompt: str
    user_message: str
    recent_conversations: list[ConversationContextItem] = Field(default_factory=list)
    similar_conversations: list[ConversationContextItem] = Field(default_factory=list)
