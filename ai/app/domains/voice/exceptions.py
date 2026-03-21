class VoiceError(Exception):
    """Voice domain error."""


class VoiceNotFoundError(VoiceError):
    """Raised when a voice cannot be found."""


class VoiceUpdateNotSupportedError(VoiceError):
    """Raised when the provider cannot update an enrolled voice in place."""
