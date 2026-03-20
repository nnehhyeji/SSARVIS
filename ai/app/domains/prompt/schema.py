from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    qna: list["PromptQnAItem"] = Field(min_length=1)


class PromptQnAItem(BaseModel):
    question: str
    answer: str


class PromptResponseData(BaseModel):
    systemPrompt: str


class PromptResponse(BaseModel):
    message: str
    data: PromptResponseData
