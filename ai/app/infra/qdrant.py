import logging
from threading import Lock
from uuid import NAMESPACE_URL, UUID, uuid5
from typing import Any, ClassVar

from qdrant_client import AsyncQdrantClient, models

from app.config.vectordb import vectordb_config
from app.exceptions.infra import VectorDBClientClosedError, VectorDBError

logger = logging.getLogger(__name__)


class QdrantClient:
    _instance: ClassVar["QdrantClient | None"] = None
    _instance_lock: ClassVar[Lock] = Lock()

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
            with cls._instance_lock:
                if cls._instance is None or cls._instance._closed:
                    cls._instance = cls()
        return cls._instance

    async def close(self) -> None:
        if self._closed:
            return
        await self._client.close()
        self._closed = True
        if type(self)._instance is self:
            type(self)._instance = None

    async def initialize_collection(self, vector_size: int) -> None:
        self._ensure_open()
        self._validate_vector_size(vector_size)
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
            raise VectorDBError("Failed to initialize vector collection") from exc

    async def initialize_default_collection(self) -> None:
        await self.initialize_collection(vectordb_config.qdrant_vector_size)

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
        self._ensure_open()
        if not points:
            return

        point_structs = [self._build_point(point) for point in points]

        try:
            await self._client.upsert(
                collection_name=self._collection_name,
                points=point_structs,
            )
        except Exception as exc:
            logger.exception("Failed to upsert points into Qdrant")
            raise VectorDBError("Failed to upsert vectors") from exc

    async def search(
        self,
        vector: list[float],
        filter_conditions: dict[str, Any] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        self._ensure_open()
        self._validate_vector(vector)
        self._validate_limit(limit)
        query_filter = self._build_query_filter(filter_conditions)

        try:
            results = await self._client.query_points(
                collection_name=self._collection_name,
                query=vector,
                query_filter=query_filter,
                limit=limit,
            )
            return [point.payload or {} for point in results.points]
        except Exception as exc:
            logger.exception("Failed to search Qdrant")
            raise VectorDBError("Failed to search vectors") from exc

    async def delete(self, point_ids: list[int | str]) -> None:
        self._ensure_open()
        if not point_ids:
            return

        try:
            await self._client.delete(
                collection_name=self._collection_name,
                points_selector=models.PointIdsList(
                    points=[self._normalize_point_id(point_id) for point_id in point_ids]
                ),
            )
        except Exception as exc:
            logger.exception("Failed to delete points from Qdrant")
            raise VectorDBError("Failed to delete vectors") from exc

    def _normalize_point_id(self, point_id: int | str | UUID) -> int | str:
        if isinstance(point_id, int):
            return point_id

        if isinstance(point_id, UUID):
            return str(point_id)

        try:
            return str(UUID(str(point_id)))
        except ValueError:
            return str(uuid5(NAMESPACE_URL, str(point_id)))

    def _build_point(self, point: dict[str, Any]) -> models.PointStruct:
        point_id = point["id"]
        normalized_id = self._normalize_point_id(point_id)
        self._validate_vector(point["vector"])
        payload = self._normalize_payload(point["payload"])

        if (
            isinstance(point_id, str)
            and normalized_id != point_id
            and "source_id" not in payload
        ):
            payload["source_id"] = point_id

        return models.PointStruct(
            id=normalized_id,
            vector=point["vector"],
            payload=payload,
        )

    def _build_query_filter(
        self,
        filter_conditions: dict[str, Any] | None,
    ) -> models.Filter | None:
        if not filter_conditions:
            return None

        return models.Filter(
            must=[
                self._build_field_condition(key, value)
                for key, value in filter_conditions.items()
            ]
        )

    def _build_field_condition(
        self,
        key: str,
        value: Any,
    ) -> models.FieldCondition:
        if isinstance(value, dict):
            if "in" in value:
                return models.FieldCondition(
                    key=key,
                    match=models.MatchAny(any=value["in"]),
                )
            if "not_in" in value:
                return models.FieldCondition(
                    key=key,
                    match=models.MatchExcept(**{"except": value["not_in"]}),
                )
            if "range" in value:
                return models.FieldCondition(
                    key=key,
                    range=models.Range(**value["range"]),
                )
            raise ValueError(f"Unsupported filter operator for '{key}'")

        if isinstance(value, list):
            return models.FieldCondition(
                key=key,
                match=models.MatchAny(any=value),
            )

        return models.FieldCondition(
            key=key,
            match=models.MatchValue(value=value),
        )

    def _ensure_open(self) -> None:
        if self._closed:
            raise VectorDBClientClosedError("Qdrant client is closed")

    def _validate_vector_size(self, vector_size: int) -> None:
        if vector_size <= 0:
            raise ValueError("vector_size must be greater than 0")

    def _validate_vector(self, vector: list[float]) -> None:
        if not vector:
            raise ValueError("vector must not be empty")

    def _validate_limit(self, limit: int) -> None:
        if limit <= 0:
            raise ValueError("limit must be greater than 0")

    def _normalize_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("payload must be a dictionary")
        return dict(payload)
