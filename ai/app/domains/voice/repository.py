from app.domains.voice.model import Voice


class VoiceRepository:
    def __init__(self) -> None:
        self._voices: dict[str, list[Voice]] = {}

    def create(self, voice: Voice) -> Voice:
        self._voices.setdefault(voice.user_id, []).append(voice)
        return voice

    def list_by_user_id(self, user_id: str) -> list[Voice]:
        return list(self._voices.get(user_id, []))

    def get_by_voice_id(self, user_id: str, voice_id: str) -> Voice | None:
        return next(
            (voice for voice in self._voices.get(user_id, []) if voice.voice_id == voice_id),
            None,
        )

    def delete(self, user_id: str, voice_id: str) -> bool:
        voices = self._voices.get(user_id, [])
        remaining = [voice for voice in voices if voice.voice_id != voice_id]
        if len(remaining) == len(voices):
            return False
        self._voices[user_id] = remaining
        return True
