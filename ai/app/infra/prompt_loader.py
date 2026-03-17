from pathlib import Path

from app.config.prompt import prompt_config


class PromptTemplateLoader:
    def __init__(self, file_path: str | None = None) -> None:
        self.file_path = Path(file_path or prompt_config.prompt_meta_file)
        self._cached_content: str | None = None

    def load_system_prompt_meta(self) -> str:
        if self._cached_content is not None:
            return self._cached_content

        if not self.file_path.exists():
            raise FileNotFoundError(f"Prompt template file not found: {self.file_path}")

        content = self.file_path.read_text(encoding="utf-8").strip()
        if not content:
            raise ValueError(f"Prompt template file is empty: {self.file_path}")

        self._cached_content = content
        return content
