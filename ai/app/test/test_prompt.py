import unittest
from pathlib import Path
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.domains.prompt.router import get_prompt_service, router
from app.infra.prompt_loader import PromptTemplateLoader


class PromptRouteTests(unittest.TestCase):
    def _make_prompt_file(self, content: str) -> Path:
        temp_dir = Path(".tmp") / "test_prompt"
        temp_dir.mkdir(parents=True, exist_ok=True)
        prompt_file = temp_dir / f"{uuid4().hex}.md"
        prompt_file.write_text(content, encoding="utf-8")
        self.addCleanup(lambda: prompt_file.unlink(missing_ok=True))
        return prompt_file

    def setUp(self) -> None:
        self.app = FastAPI()
        self.app.include_router(router, prefix="/api")
        self.client = TestClient(self.app)

    def test_prompt_crud_uses_generated_prompt(self) -> None:
        from app.domains.prompt.repository import PromptRepository
        from app.domains.prompt.service import PromptService

        prompt_file = self._make_prompt_file("system meta prompt")

        repository = PromptRepository()
        service = PromptService(
            repository=repository,
            openai_client=type("StubOpenAIClient", (), {"generate": AsyncMock(return_value="generated prompt")})(),
            prompt_loader=PromptTemplateLoader(str(prompt_file)),
        )
        self.app.dependency_overrides[get_prompt_service] = lambda: service
        self.addCleanup(self.app.dependency_overrides.clear)

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
        from app.domains.prompt.repository import PromptRepository
        from app.domains.prompt.service import PromptService

        prompt_file = self._make_prompt_file("system meta prompt")

        repository = PromptRepository()
        service = PromptService(
            repository=repository,
            openai_client=type("StubOpenAIClient", (), {"generate": AsyncMock(return_value="generated prompt")})(),
            prompt_loader=PromptTemplateLoader(str(prompt_file)),
        )
        self.app.dependency_overrides[get_prompt_service] = lambda: service
        self.addCleanup(self.app.dependency_overrides.clear)

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
        prompt_file = temp_dir / f"{uuid4().hex}.md"
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
