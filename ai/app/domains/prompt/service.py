from app.domains.prompt.schema import PromptQnAItem, PromptRequest
from app.infra.openai import OpenAIClient
from app.prompts import SYSTEM_PROMPT_META, SYSTEM_PROMPT_UPDATE_META


class PromptService:
    def __init__(
        self,
        openai_client: OpenAIClient,
        prompt_meta: str = SYSTEM_PROMPT_META,
        prompt_update_meta: str = SYSTEM_PROMPT_UPDATE_META,
    ) -> None:
        self.openai_client = openai_client
        self.prompt_meta = prompt_meta
        self.prompt_update_meta = prompt_update_meta

    async def generate_prompt(self, body: PromptRequest) -> str:
        generated_prompt = await self._generate_prompt(
            qna_items=body.qna,
            current_system_prompt=body.systemPrompt,
        )
        return generated_prompt.strip()

    async def _generate_prompt(
        self,
        qna_items: list[PromptQnAItem],
        current_system_prompt: str | None = None,
    ) -> str:
        meta_prompt = self.prompt_meta
        source_text = self._format_input(qna_items, current_system_prompt)
        if current_system_prompt and current_system_prompt.strip():
            meta_prompt = "\n\n".join(
                [
                    meta_prompt,
                    self.prompt_update_meta,
                ]
            )
        return await self.openai_client.generate(
            [
                {"role": "system", "content": meta_prompt},
                {"role": "user", "content": source_text},
            ]
        )

    @staticmethod
    def _format_qna(qna_items: list[PromptQnAItem]) -> str:
        return "\n\n".join(
            f"Q: {item.question}\nA: {item.answer}"
            for item in qna_items
        )

    @classmethod
    def _format_input(
        cls,
        qna_items: list[PromptQnAItem],
        current_system_prompt: str | None = None,
    ) -> str:
        qna_text = cls._format_qna(qna_items)
        if not current_system_prompt or not current_system_prompt.strip():
            return qna_text

        return (
            "Current system prompt:\n"
            f"{current_system_prompt.strip()}\n\n"
            "New Q&A source text:\n"
            f"{qna_text}"
        )
