import logging

from openai import APITimeoutError, AsyncOpenAI

from app.config.openai import openai_config
from app.exceptions.infra import EmbeddingError, OpenAIError

logger = logging.getLogger(__name__)


class OpenAIClient:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(
            base_url=openai_config.openai_base_url,
            api_key=openai_config.openai_api_key,
            timeout=openai_config.llm_timeout_seconds,
        )

    async def generate(self, messages: list[dict[str, str]]) -> str:
        self._validate_configuration()
        try:
            response = await self._responses_create(
                timeout=openai_config.llm_timeout_seconds,
                messages=messages,
            )
        except APITimeoutError:
            response = await self._responses_create(
                timeout=max(openai_config.llm_timeout_seconds * 2, 120.0),
                messages=messages,
            )
        except Exception as exc:
            logger.exception("OpenAI completion request failed")
            raise OpenAIError(
                f"Failed to generate completion: {type(exc).__name__}: {exc}"
            ) from exc
        return response.output_text

    async def embed(self, text: str) -> list[float]:
        self._validate_configuration()
        try:
            response = await self._embeddings_create(
                timeout=openai_config.llm_timeout_seconds,
                text=text,
            )
        except APITimeoutError:
            response = await self._embeddings_create(
                timeout=max(openai_config.llm_timeout_seconds * 2, 120.0),
                text=text,
            )
        except Exception as exc:
            logger.exception("OpenAI embedding request failed")
            raise EmbeddingError(
                f"Failed to generate embedding: {type(exc).__name__}: {exc}"
            ) from exc

        if not response.data or not response.data[0].embedding:
            raise EmbeddingError("Embedding response was empty")

        return list(response.data[0].embedding)

    @staticmethod
    def _validate_configuration() -> None:
        if not openai_config.openai_api_key.strip():
            raise OpenAIError("OPENAI_API_KEY is not configured")

    async def _responses_create(
        self,
        timeout: float,
        messages: list[dict[str, str]],
    ):
        return await self._client.responses.create(
            model=openai_config.llm_model,
            input=messages,
            timeout=timeout,
        )

    async def _embeddings_create(
        self,
        timeout: float,
        text: str,
    ):
        return await self._client.embeddings.create(
            model=openai_config.embedding_model,
            input=text,
            dimensions=openai_config.embedding_dimensions,
            timeout=timeout,
        )
