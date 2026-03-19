class PCMChunkCollector:
    def __init__(self) -> None:
        self._buffer = bytearray()

    def append(self, chunk: bytes) -> None:
        if not chunk:
            return
        self._buffer.extend(chunk)

    def extend(self, chunks: list[bytes]) -> None:
        for chunk in chunks:
            self.append(chunk)

    def to_bytes(self) -> bytes:
        return bytes(self._buffer)

    def clear(self) -> None:
        self._buffer.clear()

    def __len__(self) -> int:
        return len(self._buffer)

    def __bool__(self) -> bool:
        return bool(self._buffer)
