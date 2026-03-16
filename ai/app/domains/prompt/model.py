from dataclasses import dataclass


@dataclass(slots=True)
class Prompt:
    user_id: str
    source_text: str
    prompt: str
