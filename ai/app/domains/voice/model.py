from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Voice(Base):
    __tablename__ = "voices"

    voice_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    audio_text: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @classmethod
    def create(
        cls,
        user_id: str,
        voice_id: str,
        file_name: str,
        audio_text: str,
        created_at: datetime,
    ) -> "Voice":
        return cls(
            user_id=user_id,
            voice_id=voice_id,
            file_name=file_name,
            audio_text=audio_text,
            created_at=created_at,
        )
