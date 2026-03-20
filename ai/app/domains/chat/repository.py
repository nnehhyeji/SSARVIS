from uuid import uuid4

from pydantic import ValidationError

from app.domains.chat.schema import SimilarChatItem
from app.infra.qdrant import QdrantClient


class ChatRepository:
    def __init__(self, qdrant_client: QdrantClient) -> None:
        self.qdrant_client = qdrant_client

    async def search_similar(
        self,
        user_id: int,
        chat_mode: str,
        memory_policy: str,
        vector: list[float],
        limit: int = 1,
    ) -> list[SimilarChatItem]:
        payloads = await self.qdrant_client.search(
            vector=vector,
            filter_conditions={
                "user_id": user_id,
                "chat_mode": chat_mode,
                "memory_policy": memory_policy,
            },
            limit=limit,
        )
        records: list[SimilarChatItem] = []
        for payload in payloads:
            try:
                records.append(SimilarChatItem.model_validate(payload))
            except ValidationError:
                continue
        return records

    async def save_chat(
        self,
        user_id: int,
        chat_mode: str,
        memory_policy: str,
        text: str,
        response: str,
        vector: list[float],
    ) -> SimilarChatItem:
        chat_id = uuid4().hex
        payload = {
            "chat_id": chat_id,
            "user_id": user_id,
            "chat_mode": chat_mode,
            "memory_policy": memory_policy,
            "text": text,
            "response": response,
        }
        await self.qdrant_client.upsert(
            point_id=chat_id,
            vector=vector,
            payload=payload,
        )
        return SimilarChatItem.model_validate(payload)
