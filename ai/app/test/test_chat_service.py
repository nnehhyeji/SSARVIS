import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.domains.chat.exceptions import PromptNotFoundError
from app.domains.chat.service import ChatContextBuilder, ChatService


class ChatServiceTests(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def _prefix_loader():
        return type(
            "StubPrefixLoader",
            (),
            {"load_system_prompt_meta": lambda self: "다음은 유사 대화다."},
        )()

    @staticmethod
    def _guideline_loader():
        return type(
            "StubGuidelineLoader",
            (),
            {"load_system_prompt_meta": lambda self: "짧고 자연스럽게 답해라."},
        )()

    async def test_build_context_collects_prompt_recent_and_similar(self) -> None:
        prompt_repository = AsyncMock()
        prompt_repository.get_by_user_id.return_value = SimpleNamespace(
            prompt="You are user X"
        )

        chat_repository = AsyncMock()
        chat_repository.get_recent.return_value = [
            SimpleNamespace(user_message="안녕", assistant_message="반가워")
        ]

        openai_client = AsyncMock()
        openai_client.embed.return_value = [0.1, 0.2, 0.3]

        qdrant_client = AsyncMock()
        qdrant_client.search.return_value = [
            {"user_message": "주말 계획?", "assistant_message": "쉬려고"}
        ]

        service = ChatService(
            prompt_repository=prompt_repository,
            chat_repository=chat_repository,
            openai_client=openai_client,
            qdrant_client=qdrant_client,
            context_builder=ChatContextBuilder(),
            similar_conversations_prefix_loader=self._prefix_loader(),
            response_guideline_loader=self._guideline_loader(),
        )

        context = await service.build_context(user_id="user-1", user_message="오늘 뭐해?")

        self.assertEqual(context.system_prompt, "You are user X")
        self.assertEqual(context.user_message, "오늘 뭐해?")
        self.assertEqual(context.recent_conversations[0].assistant_message, "반가워")
        self.assertEqual(context.similar_conversations[0].user_message, "주말 계획?")
        openai_client.embed.assert_awaited_once_with("오늘 뭐해?")
        qdrant_client.search.assert_awaited_once()

    async def test_build_context_raises_when_prompt_missing(self) -> None:
        prompt_repository = AsyncMock()
        prompt_repository.get_by_user_id.return_value = None

        service = ChatService(
            prompt_repository=prompt_repository,
            chat_repository=AsyncMock(),
            openai_client=AsyncMock(),
            qdrant_client=AsyncMock(),
            similar_conversations_prefix_loader=self._prefix_loader(),
            response_guideline_loader=self._guideline_loader(),
        )

        with self.assertRaises(PromptNotFoundError):
            await service.build_context(user_id="user-1", user_message="오늘 뭐해?")

    async def test_build_messages_appends_guidelines_from_config(self) -> None:
        prompt_repository = AsyncMock()
        prompt_repository.get_by_user_id.return_value = SimpleNamespace(
            prompt="You are user X"
        )

        chat_repository = AsyncMock()
        chat_repository.get_recent.return_value = []

        openai_client = AsyncMock()
        openai_client.embed.return_value = [0.1, 0.2, 0.3]

        qdrant_client = AsyncMock()
        qdrant_client.search.return_value = []

        service = ChatService(
            prompt_repository=prompt_repository,
            chat_repository=chat_repository,
            openai_client=openai_client,
            qdrant_client=qdrant_client,
            similar_conversations_prefix_loader=self._prefix_loader(),
            response_guideline_loader=self._guideline_loader(),
        )

        messages = await service.build_messages(
            user_id="user-1",
            user_message="오늘 뭐해?",
        )

        self.assertEqual(messages[0], {"role": "system", "content": "You are user X"})
        self.assertEqual(messages[1], {"role": "user", "content": "오늘 뭐해?"})
        self.assertEqual(messages[-1], {"role": "system", "content": "짧고 자연스럽게 답해라."})

    async def test_build_context_skips_malformed_similar_payloads(self) -> None:
        prompt_repository = AsyncMock()
        prompt_repository.get_by_user_id.return_value = SimpleNamespace(
            prompt="You are user X"
        )

        chat_repository = AsyncMock()
        chat_repository.get_recent.return_value = []

        openai_client = AsyncMock()
        openai_client.embed.return_value = [0.1, 0.2, 0.3]

        qdrant_client = AsyncMock()
        qdrant_client.search.return_value = [
            {"user_message": "주말 계획?", "assistant_message": "쉬려고"},
            {"user_message": "깨진 payload"},
        ]

        service = ChatService(
            prompt_repository=prompt_repository,
            chat_repository=chat_repository,
            openai_client=openai_client,
            qdrant_client=qdrant_client,
            similar_conversations_prefix_loader=self._prefix_loader(),
            response_guideline_loader=self._guideline_loader(),
        )

        context = await service.build_context(
            user_id="user-1",
            user_message="오늘 뭐해?",
        )

        self.assertEqual(len(context.similar_conversations), 1)
        self.assertEqual(context.similar_conversations[0].assistant_message, "쉬려고")


if __name__ == "__main__":
    unittest.main()
