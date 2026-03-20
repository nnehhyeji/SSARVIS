import asyncio
import subprocess


class AudioTranscodingError(RuntimeError):
    """Raised when uploaded audio cannot be transcoded to MP3."""


class AudioTranscoder:
    async def transcode_to_mp3(self, audio_data: bytes) -> bytes:
        if not audio_data:
            raise AudioTranscodingError("audio file must not be empty")
        return await asyncio.to_thread(self._transcode_to_mp3, audio_data)

    def _transcode_to_mp3(self, audio_data: bytes) -> bytes:
        command = [
            "ffmpeg",
            "-loglevel",
            "error",
            "-i",
            "pipe:0",
            "-vn",
            "-acodec",
            "libmp3lame",
            "-f",
            "mp3",
            "pipe:1",
        ]
        try:
            completed = subprocess.run(
                command,
                input=audio_data,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
        except FileNotFoundError as exc:
            raise AudioTranscodingError("ffmpeg is not installed") from exc

        if completed.returncode != 0:
            detail = completed.stderr.decode("utf-8", errors="ignore").strip()
            raise AudioTranscodingError(f"ffmpeg failed to transcode audio: {detail}")

        if not completed.stdout:
            raise AudioTranscodingError("ffmpeg returned empty mp3 output")

        return completed.stdout
