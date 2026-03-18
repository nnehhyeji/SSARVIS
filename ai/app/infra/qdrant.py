import logging
from typing import Any, ClassVar

from qdrant_client import AsyncQdrantClient, models

from app.config.vectordb import vectordb_config

logger = logging.getLogger(__name__)


class QdrantClient:
    _instance: ClassVar["QdrantClient | None"] = None

    def __init__(self) -> None:
        self._client = AsyncQdrantClient(
            url=vectordb_config.qdrant_url,
            api_key=vectordb_config.qdrant_api_key or None,
            timeout=vectordb_config.qdrant_timeout_seconds,
        )
        self._collection_name = vectordb_config.qdrant_collection_name
        self._closed = False

    @classmethod
    def get_instance(cls) -> "QdrantClient":
        if cls._instance is None or cls._instance._closed:
            cls._instance = cls()
        return cls._instance

    async def close(self) -> None:
        if self._closed:
            return
        await self._client.close()
        self._closed = True

    async def initialize_collection(self, vector_size: int) -> None:
        try:
            collections = await self._client.get_collections()
            existing_names = {collection.name for collection in collections.collections}
            if self._collection_name in existing_names:
                return

            await self._client.create_collection(
                collection_name=self._collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE,
                ),
            )
        except Exception as exc:
            logger.exception("Failed to initialize Qdrant collection")
            raise RuntimeError("Failed to initialize vector collection") from exc

    async def upsert(
        self,
        point_id: int | str,
        vector: list[float],
        payload: dict[str, Any],
    ) -> None:
        await self.upsert_many(
            [
                {
                    "id": point_id,
                    "vector": vector,
                    "payload": payload,
                }
            ]
        )

    async def upsert_many(self, points: list[dict[str, Any]]) -> None:
        if not points:
            return

        try:
            await self._client.upsert(
                collection_name=self._collection_name,
                points=[
                    models.PointStruct(
                        id=point["id"],
                        vector=point["vector"],
                        payload=point["payload"],
                    )
                    for point in points
                ],
            )
        except Exception as exc:
            logger.exception("Failed to upsert points into Qdrant")
            raise RuntimeError("Failed to upsert vectors") from exc

    async def search(
        self,
        vector: list[float],
        filter_conditions: dict[str, Any] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        try:
            query_filter = None
            if filter_conditions:
                query_filter = models.Filter(
                    must=[
                        models.FieldCondition(
                            key=key,
                            match=models.MatchValue(value=value),
                        )
                        for key, value in filter_conditions.items()
                    ]
                )

            results = await self._client.query_points(
                collection_name=self._collection_name,
                query=vector,
                query_filter=query_filter,
                limit=limit,
            )
            return [point.payload or {} for point in results.points]
        except Exception as exc:
            logger.exception("Failed to search Qdrant")
            raise RuntimeError("Failed to search vectors") from exc

    async def delete(self, point_ids: list[int | str]) -> None:
        if not point_ids:
            return

        try:
            await self._client.delete(
                collection_name=self._collection_name,
                points_selector=models.PointIdsList(points=point_ids),
            )
        except Exception as exc:
            logger.exception("Failed to delete points from Qdrant")
            raise RuntimeError("Failed to delete vectors") from exc
