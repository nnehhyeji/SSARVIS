import os
import sys

from app.config.media import media_config


def _load_opus_library():
    if sys.platform == "win32" and media_config.opus_dll_directory:
        os.add_dll_directory(media_config.opus_dll_directory)
    import opuslib

    return opuslib


class OpusEncoder:
    def __init__(self) -> None:
        opuslib = _load_opus_library()

        self._encoder = opuslib.Encoder(
            fs=media_config.opus_sample_rate,
            channels=media_config.opus_channels,
            application=opuslib.APPLICATION_VOIP,
        )
        self._frame_size = (
            media_config.opus_sample_rate * media_config.opus_frame_duration_ms // 1000
        )
        self._bytes_per_frame = self._frame_size * 2 * media_config.opus_channels
        self._buffer = b""

    def encode(self, pcm_data: bytes) -> list[bytes]:
        self._buffer += pcm_data
        packets: list[bytes] = []

        while len(self._buffer) >= self._bytes_per_frame:
            frame = self._buffer[: self._bytes_per_frame]
            self._buffer = self._buffer[self._bytes_per_frame :]
            packets.append(self._encoder.encode(frame, self._frame_size))

        return packets

    def flush(self) -> list[bytes]:
        if not self._buffer:
            return []

        padded = self._buffer.ljust(self._bytes_per_frame, b"\x00")
        self._buffer = b""
        return [self._encoder.encode(padded, self._frame_size)]
