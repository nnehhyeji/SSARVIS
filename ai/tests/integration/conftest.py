import subprocess
import time
from pathlib import Path
from collections.abc import Iterator

import httpx
import pytest
from qdrant_client import QdrantClient
from qdrant_client.http import models


COMPOSE_FILE = "docker-compose.integration.yml"
API_BASE_URL = "http://127.0.0.1:18000"
QDRANT_URL = "http://127.0.0.1:16333"
COLLECTION_NAME = "integration_chats"
SAMPLE_VOICE_WAV = Path(".ref/sample/voice/kim_haru.wav")
SAMPLE_VOICE_TEXT = Path(".ref/sample/voice/kim_haru.txt")


def _compose_command(*args: str) -> list[str]:
    return ["docker", "compose", "-f", COMPOSE_FILE, *args]


def _wait_for_api(timeout_seconds: int = 90) -> None:
    deadline = time.time() + timeout_seconds
    last_error: Exception | None = None

    while time.time() < deadline:
        try:
            response = httpx.get(f"{API_BASE_URL}/api/health", timeout=2.0)
            if response.status_code == 200:
                return
        except Exception as exc:  # pragma: no cover - diagnostic path
            last_error = exc
        time.sleep(1)

    raise RuntimeError(f"API did not become healthy in time: {last_error}")


@pytest.fixture(scope="session", autouse=True)
def docker_stack() -> Iterator[None]:
    subprocess.run(
        _compose_command("up", "-d", "--build"),
        check=True,
    )
    _wait_for_api()
    try:
        yield
    finally:
        subprocess.run(
            _compose_command("down", "-v"),
            check=False,
        )


@pytest.fixture()
def http_client(docker_stack: None) -> Iterator[httpx.Client]:
    with httpx.Client(base_url=API_BASE_URL, timeout=120.0) as client:
        yield client


@pytest.fixture()
def qdrant_client(docker_stack: None) -> Iterator[QdrantClient]:
    client = QdrantClient(url=QDRANT_URL)
    try:
        yield client
    finally:
        client.close()


@pytest.fixture(scope="session")
def sample_voice_audio_uri() -> str:
    payload = SAMPLE_VOICE_WAV.read_bytes()
    import base64

    encoded = base64.b64encode(payload).decode("utf-8")
    return f"data:audio/wav;base64,{encoded}"


@pytest.fixture(scope="session")
def sample_voice_text() -> str:
    return SAMPLE_VOICE_TEXT.read_text(encoding="utf-8").strip()


@pytest.fixture(autouse=True)
def clear_qdrant_collection(qdrant_client: QdrantClient) -> Iterator[None]:
    try:
        qdrant_client.delete_collection(collection_name=COLLECTION_NAME)
    except Exception:
        pass
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE),
    )
    yield
