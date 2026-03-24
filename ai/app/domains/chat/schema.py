from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, StringConstraints
from typing_extensions import Annotated


NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ChatRole(StrEnum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ChatSessionType(StrEnum):
    USER_AI = "USER_AI"
    AVATAR_AI = "AVATAR_AI"


class ChatMode(StrEnum):
    DAILY = "DAILY"
    STUDY = "STUDY"
    COUNSEL = "COUNSEL"
    PERSONA = "PERSONA"


class MemoryPolicy(StrEnum):
    GENERAL = "GENERAL"
    SECRET = "SECRET"


class ChatRequest(BaseModel):
    sessionId: NonEmptyStr
    userId: int
    chatSessionType: ChatSessionType
    chatMode: ChatMode
    isFollowing: bool | None = None
    memoryPolicy: MemoryPolicy
    systemPrompt: NonEmptyStr
    history: list["ChatHistoryItem"] = Field(default_factory=list, max_length=30)
    text: NonEmptyStr
    voiceId: NonEmptyStr


class ChatHistoryItem(BaseModel):
    role: ChatRole
    content: NonEmptyStr


class SimilarChatItem(BaseModel):
    session_id: str
    user_id: int
    chat_session_type: ChatSessionType
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
