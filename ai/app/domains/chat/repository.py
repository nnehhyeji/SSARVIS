from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.chat.model import ChatMessage


class ChatRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        user_id: str,
        user_message: str,
        assistant_message: str,
    ) -> ChatMessage:
        record = ChatMessage(
            user_id=user_id,
            user_message=user_message,
            assistant_message=assistant_message,
        )
        self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def get_recent(self, user_id: str, limit: int = 30) -> list[ChatMessage]:
        subquery = (
            select(ChatMessage.id)
            .where(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .limit(limit)
            .subquery()
        )
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.id.in_(select(subquery.c.id)))
            .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        )
        return list(result.scalars().all())
