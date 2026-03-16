from pydantic import BaseModel, ConfigDict


class PromptRequest(BaseModel):
    source_text: str


class PromptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    source_text: str
    prompt: str
