from app.domains.prompt.model import Prompt
from app.domains.prompt.repository import PromptRepository
from app.domains.prompt.schema import PromptRequest


class PromptService:
    def __init__(self, repository: PromptRepository) -> None:
        self.repository = repository

    def create_prompt(self, user_id: str, body: PromptRequest) -> Prompt:
        prompt = Prompt(
            user_id=user_id,
            source_text=body.source_text,
            prompt=body.source_text,
        )
        return self.repository.create(prompt)

    def get_prompt(self, user_id: str) -> Prompt | None:
        return self.repository.get_by_user_id(user_id)

    def update_prompt(self, user_id: str, body: PromptRequest) -> Prompt | None:
        prompt = Prompt(
            user_id=user_id,
            source_text=body.source_text,
            prompt=body.source_text,
        )
        return self.repository.update(prompt)

    def delete_prompt(self, user_id: str) -> bool:
        return self.repository.delete(user_id)
