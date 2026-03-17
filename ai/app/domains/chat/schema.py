from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    voice_id: str
