import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base, get_db_session
from app.domains.prompt.model import Prompt  # noqa: F401
from app.domains.prompt.router import get_openai_client, get_prompt_loader, router
from app.infra.prompt_loader import PromptTemplateLoader


class PromptRouteTests(unittest.TestCase):
    def _make_prompt_file(self, content: str) -> Path:
        temp_dir = Path(".tmp") / "test_prompt"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = tempfile.NamedTemporaryFile(dir=temp_dir, suffix=".md", delete=False)
        temp_file.close()
        prompt_file = Path(temp_file.name)
        prompt_file.write_text(content, encoding="utf-8")
        self.addCleanup(lambda: prompt_file.unlink(missing_ok=True))
        return prompt_file

    def setUp(self) -> None:
        self.app = FastAPI()
        self.app.include_router(router, prefix="/api")
        self.temp_db = tempfile.NamedTemporaryFile(dir=".tmp", suffix=".db", delete=False)
        self.temp_db.close()
        self.db_path = Path(self.temp_db.name)
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{self.db_path.as_posix()}")
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)

        async def override_get_db_session():
            async with self.session_factory() as session:
                yield session

        async def init_models() -> None:
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

        import asyncio

        asyncio.run(init_models())

        self.app.dependency_overrides[get_db_session] = override_get_db_session
        self.client = TestClient(self.app)
        self.addCleanup(self.app.dependency_overrides.clear)
        self.addCleanup(self.client.close)
        self.addCleanup(lambda: self.db_path.unlink(missing_ok=True))
        self.addCleanup(lambda: asyncio.run(self.engine.dispose()))

    def test_prompt_crud_uses_generated_prompt(self) -> None:
        prompt_file = self._make_prompt_file("system meta prompt")
        openai_stub = type("StubOpenAIClient", (), {"generate": AsyncMock(return_value="generated prompt")})()
        self.app.dependency_overrides[get_openai_client] = lambda: openai_stub
        self.app.dependency_overrides[get_prompt_loader] = lambda: PromptTemplateLoader(str(prompt_file))

        created = self.client.post(
            "/api/prompt",
            headers={"X-User-Id": "user-1"},
            json={"source_text": "source text"},
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["prompt"], "generated prompt")

        fetched = self.client.get("/api/prompt", headers={"X-User-Id": "user-1"})
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["prompt"], "generated prompt")

        updated = self.client.put(
            "/api/prompt",
            headers={"X-User-Id": "user-1"},
            json={"source_text": "updated source text"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["prompt"], "generated prompt")

        response = self.client.delete("/api/prompt", headers={"X-User-Id": "user-1"})
        self.assertEqual(response.status_code, 204)

    def test_create_prompt_rejects_duplicate_user(self) -> None:
        prompt_file = self._make_prompt_file("system meta prompt")
        openai_stub = type("StubOpenAIClient", (), {"generate": AsyncMock(return_value="generated prompt")})()
        self.app.dependency_overrides[get_openai_client] = lambda: openai_stub
        self.app.dependency_overrides[get_prompt_loader] = lambda: PromptTemplateLoader(str(prompt_file))

        first = self.client.post(
            "/api/prompt",
            headers={"X-User-Id": "user-1"},
            json={"source_text": "source text"},
        )
        second = self.client.post(
            "/api/prompt",
            headers={"X-User-Id": "user-1"},
            json={"source_text": "source text"},
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)


class PromptTemplateLoaderTests(unittest.TestCase):
    def _make_prompt_file(self, content: str) -> Path:
        temp_dir = Path(".tmp") / "test_prompt"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = tempfile.NamedTemporaryFile(dir=temp_dir, suffix=".md", delete=False)
        temp_file.close()
        prompt_file = Path(temp_file.name)
        prompt_file.write_text(content, encoding="utf-8")
        self.addCleanup(lambda: prompt_file.unlink(missing_ok=True))
        return prompt_file

    def test_load_system_prompt_meta_reads_file(self) -> None:
        prompt_file = self._make_prompt_file("meta prompt")

        loader = PromptTemplateLoader(str(prompt_file))

        self.assertEqual(loader.load_system_prompt_meta(), "meta prompt")

    def test_load_system_prompt_meta_raises_on_missing_file(self) -> None:
        loader = PromptTemplateLoader("missing-meta.md")

        with self.assertRaises(FileNotFoundError):
            loader.load_system_prompt_meta()

    def test_load_system_prompt_meta_raises_on_empty_file(self) -> None:
        prompt_file = self._make_prompt_file("   \n")

        loader = PromptTemplateLoader(str(prompt_file))

        with self.assertRaises(ValueError):
            loader.load_system_prompt_meta()


if __name__ == "__main__":
    unittest.main()
