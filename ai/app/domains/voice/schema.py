from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VoiceCreateItem(BaseModel):
    audio_uri: str
    audio_text: str


class VoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    voice_id: str
    file_name: str
    audio_text: str
    created_at: datetime
