from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.prompt.model import Prompt


class PromptRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, prompt: Prompt) -> Prompt:
        self.session.add(prompt)
        await self.session.commit()
        await self.session.refresh(prompt)
        return prompt

    async def get_by_user_id(self, user_id: str) -> Prompt | None:
        result = await self.session.execute(
            select(Prompt).where(Prompt.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update(self, user_id: str, source_text: str, prompt_text: str) -> Prompt | None:
        record = await self.get_by_user_id(user_id)
        if record is None:
            return None
        record.source_text = source_text
        record.prompt = prompt_text
        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def delete(self, user_id: str) -> bool:
        record = await self.get_by_user_id(user_id)
        if record is None:
            return False
        await self.session.delete(record)
        await self.session.commit()
        return True
