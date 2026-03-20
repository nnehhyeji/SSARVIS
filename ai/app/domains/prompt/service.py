from app.domains.prompt.schema import PromptQnAItem, PromptRequest
from app.infra.openai import OpenAIClient
from app.infra.prompt_loader import PromptTemplateLoader


class PromptService:
    def __init__(
        self,
        openai_client: OpenAIClient,
        prompt_loader: PromptTemplateLoader,
    ) -> None:
        self.openai_client = openai_client
        self.prompt_loader = prompt_loader

    async def generate_prompt(self, body: PromptRequest) -> str:
        generated_prompt = await self._generate_prompt(body.qna)
        return generated_prompt.strip()

    async def _generate_prompt(self, qna_items: list[PromptQnAItem]) -> str:
        meta_prompt = self.prompt_loader.load_system_prompt_meta()
        source_text = self._format_qna(qna_items)
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
