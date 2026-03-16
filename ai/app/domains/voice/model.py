from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(slots=True)
class Voice:
    user_id: str
    voice_id: str
    file_name: str
    audio_text: str
    created_at: datetime

    @classmethod
    def create(
        cls,
        user_id: str,
        voice_id: str,
        file_name: str,
        audio_text: str,
    ) -> "Voice":
        return cls(
            user_id=user_id,
            voice_id=voice_id,
            file_name=file_name,
            audio_text=audio_text,
            created_at=datetime.now(timezone.utc),
        )
