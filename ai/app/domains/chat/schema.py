from typing import Literal

from pydantic import BaseModel, Field, StringConstraints
from typing_extensions import Annotated


NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
ChatRole = Literal["system", "user", "assistant"]


class ChatRequest(BaseModel):
    sessionId: NonEmptyStr
    userId: int
    chatMode: NonEmptyStr
    memoryPolicy: NonEmptyStr
    isPublic: bool = False
    systemPrompt: NonEmptyStr
    history: list["ChatHistoryItem"] = Field(default_factory=list)
    text: NonEmptyStr
    voiceId: NonEmptyStr


class ChatHistoryItem(BaseModel):
    role: ChatRole
    content: NonEmptyStr


class SimilarChatItem(BaseModel):
    session_id: str
    user_id: int
    chat_mode: str
    memory_policy: str
    text: str
    response: str


class ChatContext(BaseModel):
    system_prompt: str
    history: list[ChatHistoryItem] = Field(default_factory=list)
    user_text: str
    similar_conversations: list[SimilarChatItem] = Field(default_factory=list)


class ChatEvent(BaseModel):
    type: str
    sessionId: str
    sequence: int | None = None
    payload: dict = Field(default_factory=dict)


class ChatErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    detail: str
    payload: dict = Field(default_factory=dict)
