from openai import AsyncOpenAI

from app.config.openai import openai_config


class OpenAIClient:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(
            api_key=openai_config.openai_api_key,
            timeout=openai_config.llm_timeout_seconds,
        )

    async def generate(self, messages: list[dict[str, str]]) -> str:
        response = await self._client.responses.create(
            model=openai_config.llm_model,
            input=messages,
        )
        return response.output_text
