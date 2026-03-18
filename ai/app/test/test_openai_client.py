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
            primary = client_cls.return_value
            retry = SimpleNamespace(
                embeddings=SimpleNamespace(
                    create=AsyncMock(
                        return_value=SimpleNamespace(
                            data=[SimpleNamespace(embedding=[0.1, 0.2])]
                        )
                    )
                )
            )
            client_cls.side_effect = [primary, retry]
            primary.embeddings.create = AsyncMock(side_effect=APITimeoutError("timeout"))

            openai_client = OpenAIClient()
            result = await openai_client.embed("hello")

            self.assertEqual(result, [0.1, 0.2])

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
