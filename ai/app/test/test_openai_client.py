import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from openai import APITimeoutError

from app.exceptions.infra import EmbeddingError, OpenAIError
from app.infra.openai import OpenAIClient


class OpenAIClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_embed_wraps_unexpected_errors(self) -> None:
        with patch("app.infra.openai.AsyncOpenAI") as client_cls:
            client = client_cls.return_value
            client.embeddings.create = AsyncMock(side_effect=RuntimeError("boom"))

            openai_client = OpenAIClient()

            with self.assertRaises(EmbeddingError):
                await openai_client.embed("hello")

    async def test_embed_retries_on_timeout(self) -> None:
        with patch("app.infra.openai.AsyncOpenAI") as client_cls:
            client = client_cls.return_value
            client.embeddings.create = AsyncMock(
                side_effect=[
                    APITimeoutError("timeout"),
                    SimpleNamespace(data=[SimpleNamespace(embedding=[0.1, 0.2])]),
                ]
            )

            openai_client = OpenAIClient()
            result = await openai_client.embed("hello")

            self.assertEqual(result, [0.1, 0.2])
            self.assertEqual(client.embeddings.create.await_count, 2)
            _, first_kwargs = client.embeddings.create.await_args_list[0]
            _, second_kwargs = client.embeddings.create.await_args_list[1]
            self.assertIn("timeout", first_kwargs)
            self.assertIn("timeout", second_kwargs)
            client_cls.assert_called_once()

    async def test_embed_rejects_empty_response(self) -> None:
        with patch("app.infra.openai.AsyncOpenAI") as client_cls:
            client = client_cls.return_value
            client.embeddings.create = AsyncMock(return_value=SimpleNamespace(data=[]))

            openai_client = OpenAIClient()

            with self.assertRaises(EmbeddingError):
                await openai_client.embed("hello")

    async def test_generate_wraps_unexpected_errors(self) -> None:
        with patch("app.infra.openai.AsyncOpenAI") as client_cls:
            client = client_cls.return_value
            client.responses.create = AsyncMock(side_effect=RuntimeError("boom"))

            openai_client = OpenAIClient()

            with self.assertRaises(OpenAIError):
                await openai_client.generate([{"role": "user", "content": "hello"}])


if __name__ == "__main__":
    unittest.main()
