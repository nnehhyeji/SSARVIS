from typing import Any

from qdrant_client import AsyncQdrantClient, models

from app.config.vectordb import vectordb_config


class QdrantClient:
    def __init__(self) -> None:
        self._client = AsyncQdrantClient(
            url=vectordb_config.qdrant_url,
            api_key=vectordb_config.qdrant_api_key or None,
            timeout=vectordb_config.qdrant_timeout_seconds,
        )
        self._collection_name = vectordb_config.qdrant_collection_name

    async def initialize_collection(self, vector_size: int) -> None:
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

    async def upsert(
        self,
        point_id: int | str,
        vector: list[float],
        payload: dict[str, Any],
    ) -> None:
        await self._client.upsert(
            collection_name=self._collection_name,
            points=[models.PointStruct(id=point_id, vector=vector, payload=payload)],
        )

    async def search(
        self,
        vector: list[float],
        filter_conditions: dict[str, Any] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
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

    async def delete(self, point_ids: list[int | str]) -> None:
        if not point_ids:
            return

        await self._client.delete(
            collection_name=self._collection_name,
            points_selector=models.PointIdsList(points=point_ids),
        )
