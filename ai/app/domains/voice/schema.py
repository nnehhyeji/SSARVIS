from pydantic import BaseModel


class VoiceCreateItem(BaseModel):
    audio_uri: str
    audio_text: str


class VoiceResponse(BaseModel):
    voice_id: str
    file_name: str
    audio_text: str
