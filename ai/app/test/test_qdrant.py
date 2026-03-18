import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.infra.qdrant import QdrantClient


class QdrantClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_initialize_collection_creates_missing_collection(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.get_collections = AsyncMock(
                return_value=SimpleNamespace(collections=[])
            )
            client.create_collection = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.initialize_collection(vector_size=1536)

            client.create_collection.assert_awaited_once()

    async def test_initialize_collection_skips_existing_collection(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.get_collections = AsyncMock(
                return_value=SimpleNamespace(
                    collections=[SimpleNamespace(name="conversations")]
                )
            )
            client.create_collection = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.initialize_collection(vector_size=1536)

            client.create_collection.assert_not_called()

    async def test_upsert_passes_point_to_client(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.upsert = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.upsert(
                point_id=1,
                vector=[0.1, 0.2],
                payload={"user_id": "user-1"},
            )

            client.upsert.assert_awaited_once()

    async def test_search_returns_payloads(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.query_points = AsyncMock(
                return_value=SimpleNamespace(
                    points=[
                        SimpleNamespace(payload={"user_id": "user-1", "text": "hello"}),
                        SimpleNamespace(payload={"user_id": "user-1", "text": "world"}),
                    ]
                )
            )

            qdrant = QdrantClient()
            result = await qdrant.search(
                vector=[0.1, 0.2],
                filter_conditions={"user_id": "user-1"},
                limit=2,
            )

            self.assertEqual(
                result,
                [
                    {"user_id": "user-1", "text": "hello"},
                    {"user_id": "user-1", "text": "world"},
                ],
            )

    async def test_delete_skips_empty_ids(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.delete = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.delete([])

            client.delete.assert_not_called()

    async def test_delete_calls_client_for_ids(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.delete = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.delete([1, 2])

            client.delete.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
