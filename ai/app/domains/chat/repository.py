from uuid import uuid4

from pydantic import ValidationError

from app.domains.chat.schema import SimilarChatItem
from app.infra.qdrant import QdrantClient


class ChatRepository:
    def __init__(self, qdrant_client: QdrantClient) -> None:
        self.qdrant_client = qdrant_client

    async def search_similar(
        self,
        session_id: str,
        user_id: int,
        chat_session_type: str,
        chat_mode: str,
        vector: list[float],
        limit: int = 1,
    ) -> list[SimilarChatItem]:
        payloads = await self.qdrant_client.search(
            vector=vector,
            filter_conditions={
                "session_id": session_id,
                "user_id": user_id,
                "chat_session_type": chat_session_type,
                "chat_mode": chat_mode,
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
        session_id: str,
        user_id: int,
        chat_session_type: str,
        chat_mode: str,
        memory_policy: str,
        text: str,
        response: str,
        vector: list[float],
    ) -> SimilarChatItem:
        payload = {
            "session_id": session_id,
            "user_id": user_id,
            "chat_session_type": chat_session_type,
            "chat_mode": chat_mode,
            "memory_policy": memory_policy,
            "text": text,
            "response": response,
        }
        await self.qdrant_client.upsert(
            point_id=self._build_point_id(session_id),
            vector=vector,
            payload=payload,
        )
        return SimilarChatItem.model_validate(payload)

    @staticmethod
    def _build_point_id(session_id: str) -> str:
        return f"{session_id}:{uuid4()}"
