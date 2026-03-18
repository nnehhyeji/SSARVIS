import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.exceptions.infra import VectorDBClientClosedError, VectorDBError
from app.infra.qdrant import QdrantClient


class QdrantClientTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        QdrantClient._instance = None

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
            client.get_collections.assert_awaited_once()

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

    async def test_initialize_collection_wraps_client_errors(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.get_collections = AsyncMock(side_effect=RuntimeError("boom"))

            qdrant = QdrantClient()

            with self.assertRaises(VectorDBError):
                await qdrant.initialize_collection(vector_size=1536)

    async def test_initialize_collection_rejects_invalid_vector_size(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient"):
            qdrant = QdrantClient()

            with self.assertRaises(ValueError):
                await qdrant.initialize_collection(vector_size=0)

    async def test_initialize_default_collection_uses_configured_size(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.get_collections = AsyncMock(return_value=SimpleNamespace(collections=[]))
            client.create_collection = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.initialize_default_collection()

            client.create_collection.assert_awaited_once()

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

    async def test_upsert_many_passes_points_to_client(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.upsert = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.upsert_many(
                [
                    {"id": 1, "vector": [0.1, 0.2], "payload": {"text": "a"}},
                    {"id": 2, "vector": [0.3, 0.4], "payload": {"text": "b"}},
                ]
            )

            client.upsert.assert_awaited_once()

    async def test_upsert_many_normalizes_string_ids(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.upsert = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.upsert_many(
                [{"id": "custom-id", "vector": [0.1, 0.2], "payload": {"text": "a"}}]
            )

            _, kwargs = client.upsert.await_args
            point = kwargs["points"][0]
            self.assertIsInstance(point.id, str)
            self.assertNotEqual(point.id, "custom-id")
            self.assertEqual(point.payload["source_id"], "custom-id")

    async def test_upsert_many_preserves_existing_source_id(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.upsert = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.upsert_many(
                [
                    {
                        "id": "custom-id",
                        "vector": [0.1, 0.2],
                        "payload": {"text": "a", "source_id": "external-1"},
                    }
                ]
            )

            _, kwargs = client.upsert.await_args
            point = kwargs["points"][0]
            self.assertEqual(point.payload["source_id"], "external-1")

    async def test_upsert_many_rejects_empty_vector(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient"):
            qdrant = QdrantClient()

            with self.assertRaises(ValueError):
                await qdrant.upsert_many(
                    [{"id": 1, "vector": [], "payload": {"text": "a"}}]
                )

    async def test_upsert_many_rejects_non_dict_payload(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient"):
            qdrant = QdrantClient()

            with self.assertRaises(ValueError):
                await qdrant.upsert_many(
                    [{"id": 1, "vector": [0.1, 0.2], "payload": "bad"}]
                )

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

    async def test_search_wraps_client_errors(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.query_points = AsyncMock(side_effect=RuntimeError("boom"))

            qdrant = QdrantClient()

            with self.assertRaises(VectorDBError):
                await qdrant.search(vector=[0.1, 0.2], limit=2)

    async def test_search_supports_list_filter_values(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.query_points = AsyncMock(return_value=SimpleNamespace(points=[]))

            qdrant = QdrantClient()
            await qdrant.search(
                vector=[0.1, 0.2],
                filter_conditions={"user_id": ["user-1", "user-2"]},
                limit=2,
            )

            client.query_points.assert_awaited_once()

    async def test_search_supports_range_filter_values(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.query_points = AsyncMock(return_value=SimpleNamespace(points=[]))

            qdrant = QdrantClient()
            await qdrant.search(
                vector=[0.1, 0.2],
                filter_conditions={"score": {"range": {"gte": 10, "lte": 20}}},
                limit=2,
            )

            client.query_points.assert_awaited_once()

    async def test_search_rejects_empty_vector(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient"):
            qdrant = QdrantClient()

            with self.assertRaises(ValueError):
                await qdrant.search(vector=[], limit=2)

    async def test_search_rejects_non_positive_limit(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient"):
            qdrant = QdrantClient()

            with self.assertRaises(ValueError):
                await qdrant.search(vector=[0.1, 0.2], limit=0)

    async def test_search_rejects_unsupported_filter_operator(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient"):
            qdrant = QdrantClient()

            with self.assertRaises(ValueError):
                await qdrant.search(
                    vector=[0.1, 0.2],
                    filter_conditions={"score": {"unknown": 10}},
                    limit=2,
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

    async def test_delete_normalizes_string_ids(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.delete = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.delete(["custom-id"])

            _, kwargs = client.delete.await_args
            selector = kwargs["points_selector"]
            self.assertIsInstance(selector.points[0], str)
            self.assertNotEqual(selector.points[0], "custom-id")

    async def test_close_closes_underlying_client(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client = client_cls.return_value
            client.close = AsyncMock()

            qdrant = QdrantClient()
            QdrantClient._instance = qdrant
            await qdrant.close()

            client.close.assert_awaited_once()
            self.assertIsNone(QdrantClient._instance)

    async def test_get_instance_reuses_singleton(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient"):
            first = QdrantClient.get_instance()
            second = QdrantClient.get_instance()

            self.assertIs(first, second)

    async def test_get_instance_recreates_closed_singleton(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client_cls.return_value.close = AsyncMock()

            first = QdrantClient.get_instance()
            await first.close()
            second = QdrantClient.get_instance()

            self.assertIsNot(first, second)

    async def test_closed_client_rejects_operations(self) -> None:
        with patch("app.infra.qdrant.AsyncQdrantClient") as client_cls:
            client_cls.return_value.close = AsyncMock()

            qdrant = QdrantClient()
            await qdrant.close()

            with self.assertRaises(VectorDBClientClosedError):
                await qdrant.search(vector=[0.1, 0.2], limit=2)


if __name__ == "__main__":
    unittest.main()
