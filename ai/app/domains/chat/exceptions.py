class ChatError(Exception):
    """Chat domain error."""


class PromptNotFoundError(ChatError):
    """Prompt not found for the user."""
