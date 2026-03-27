import asyncio
import subprocess

from app.config.media import media_config


class WebMEncodingError(RuntimeError):
    """Raised when PCM data cannot be converted to WebM."""


class WebMAudioEncoder:
    def __init__(self, chunk_size: int = 32 * 1024) -> None:
        self.chunk_size = chunk_size

    async def encode_chunks(self, pcm_data: bytes) -> list[bytes]:
        if not pcm_data:
            return []
        encoded = await asyncio.to_thread(self._encode_pcm_to_webm, pcm_data)
        return [
            encoded[index:index + self.chunk_size]
            for index in range(0, len(encoded), self.chunk_size)
        ]

    def _encode_pcm_to_webm(self, pcm_data: bytes) -> bytes:
        command = [
            "ffmpeg",
            "-loglevel",
            "error",
            "-f",
            "s16le",
            "-ar",
            str(media_config.opus_sample_rate),
            "-ac",
            str(media_config.opus_channels),
            "-i",
            "pipe:0",
            "-filter:a",
            media_config.build_atempo_filter(),
            "-c:a",
            "libopus",
            "-f",
            "webm",
            "pipe:1",
        ]
        try:
            completed = subprocess.run(
                command,
                input=pcm_data,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
        except FileNotFoundError as exc:
            raise WebMEncodingError("ffmpeg is not installed") from exc

        if completed.returncode != 0:
            detail = completed.stderr.decode("utf-8", errors="ignore").strip()
            raise WebMEncodingError(f"ffmpeg failed to encode webm: {detail}")

        if not completed.stdout:
            raise WebMEncodingError("ffmpeg returned empty webm output")

        return completed.stdout
