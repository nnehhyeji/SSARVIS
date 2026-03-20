from pydantic import BaseModel


class VoiceCreateRequest(BaseModel):
    audioUrl: str
    audioText: str


class VoiceUpdateRequest(BaseModel):
    voiceId: str
    audioUrl: str
    audioText: str


class VoiceDeleteRequest(BaseModel):
    voiceId: str


class VoiceCreateResponseData(BaseModel):
    voiceId: str


class VoiceCreateResponse(BaseModel):
    message: str
    data: VoiceCreateResponseData


class VoiceMutationResponse(BaseModel):
    message: str
    data: dict
