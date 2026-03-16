from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.voice.model import Voice


class VoiceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, voice: Voice) -> Voice:
        self.session.add(voice)
        await self.session.commit()
        await self.session.refresh(voice)
        return voice

    async def list_by_user_id(self, user_id: str) -> list[Voice]:
        result = await self.session.execute(
            select(Voice)
            .where(Voice.user_id == user_id)
            .order_by(Voice.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_voice_id(self, user_id: str, voice_id: str) -> Voice | None:
        result = await self.session.execute(
            select(Voice).where(Voice.user_id == user_id, Voice.voice_id == voice_id)
        )
        return result.scalar_one_or_none()

    async def delete(self, user_id: str, voice_id: str) -> bool:
        result = await self.session.execute(
            delete(Voice)
            .where(Voice.user_id == user_id, Voice.voice_id == voice_id)
        )
        await self.session.commit()
        return result.rowcount > 0
