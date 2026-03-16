from pydantic import BaseModel


class PromptRequest(BaseModel):
    source_text: str


class PromptResponse(BaseModel):
    user_id: str
    source_text: str
    prompt: str
