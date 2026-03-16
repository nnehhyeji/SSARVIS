class VoiceError(Exception):
    """Voice domain error."""


class VoiceNotFoundError(VoiceError):
    """Raised when a voice cannot be found."""
