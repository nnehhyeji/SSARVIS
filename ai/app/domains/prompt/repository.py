from app.domains.prompt.model import Prompt


class PromptRepository:
    def __init__(self) -> None:
        self._prompts: dict[str, Prompt] = {}

    def create(self, prompt: Prompt) -> Prompt:
        self._prompts[prompt.user_id] = prompt
        return prompt

    def get_by_user_id(self, user_id: str) -> Prompt | None:
        return self._prompts.get(user_id)

    def update(self, prompt: Prompt) -> Prompt | None:
        if prompt.user_id not in self._prompts:
            return None
        self._prompts[prompt.user_id] = prompt
        return prompt

    def delete(self, user_id: str) -> bool:
        if user_id not in self._prompts:
            return False
        del self._prompts[user_id]
        return True
