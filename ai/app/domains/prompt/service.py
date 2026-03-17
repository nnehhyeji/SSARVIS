from app.domains.prompt.model import Prompt
from app.domains.prompt.repository import PromptRepository
from app.domains.prompt.schema import PromptRequest
from app.infra.openai import OpenAIClient
from app.infra.prompt_loader import PromptTemplateLoader


class PromptService:
    def __init__(
        self,
        repository: PromptRepository,
        openai_client: OpenAIClient,
        prompt_loader: PromptTemplateLoader,
    ) -> None:
        self.repository = repository
        self.openai_client = openai_client
        self.prompt_loader = prompt_loader

    async def create_prompt(self, user_id: str, body: PromptRequest) -> Prompt:
        generated_prompt = await self._generate_prompt(body.source_text)
        prompt = Prompt(user_id=user_id, source_text=body.source_text, prompt=generated_prompt)
        return await self.repository.create(prompt)

    async def get_prompt(self, user_id: str) -> Prompt | None:
        return await self.repository.get_by_user_id(user_id)

    async def update_prompt(self, user_id: str, body: PromptRequest) -> Prompt | None:
        generated_prompt = await self._generate_prompt(body.source_text)
        return await self.repository.update(user_id, body.source_text, generated_prompt)

    async def delete_prompt(self, user_id: str) -> bool:
        return await self.repository.delete(user_id)

    async def _generate_prompt(self, source_text: str) -> str:
        meta_prompt = self.prompt_loader.load_system_prompt_meta()
        return await self.openai_client.generate(
            [
                {"role": "system", "content": meta_prompt},
                {"role": "user", "content": source_text},
            ]
        )
