import unittest

from app.domains.chat.service import ChatContextBuilder


class ChatContextBuilderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.builder = ChatContextBuilder()

    def test_build_context_normalizes_conversation_dicts(self) -> None:
        context = self.builder.build_context(
            system_prompt="You are user X",
            user_message="오늘 뭐해?",
            recent_conversations=[
                {"user_message": "안녕", "assistant_message": "반가워"}
            ],
            similar_conversations=[
                {"user_message": "주말 계획?", "assistant_message": "쉬려고"}
            ],
        )

        self.assertEqual(context.system_prompt, "You are user X")
        self.assertEqual(context.recent_conversations[0].assistant_message, "반가워")
        self.assertEqual(context.similar_conversations[0].user_message, "주말 계획?")

    def test_build_messages_matches_ref_order(self) -> None:
        context = self.builder.build_context(
            system_prompt="You are user X",
            user_message="오늘 뭐해?",
            recent_conversations=[
                {"user_message": "안녕", "assistant_message": "반가워"}
            ],
            similar_conversations=[
                {"user_message": "주말 계획?", "assistant_message": "쉬려고"}
            ],
        )

        messages = self.builder.build_messages(
            context=context,
            similar_conversations_prefix="다음은 내가 과거에 나눈 비슷한 대화이다.\n",
            response_guideline_prompt="짧고 자연스럽게 답해라.",
        )

        self.assertEqual(messages[0], {"role": "system", "content": "You are user X"})
        self.assertEqual(messages[1], {"role": "user", "content": "안녕"})
        self.assertEqual(messages[2], {"role": "assistant", "content": "반가워"})
        self.assertEqual(messages[3], {"role": "user", "content": "오늘 뭐해?"})
        self.assertEqual(messages[4]["role"], "system")
        self.assertIn("Q: 주말 계획?", messages[4]["content"])
        self.assertEqual(
            messages[5],
            {"role": "system", "content": "짧고 자연스럽게 답해라."},
        )

    def test_build_messages_omits_optional_system_sections_when_empty(self) -> None:
        context = self.builder.build_context(
            system_prompt="You are user X",
            user_message="오늘 뭐해?",
        )

        messages = self.builder.build_messages(context=context)

        self.assertEqual(
            messages,
            [
                {"role": "system", "content": "You are user X"},
                {"role": "user", "content": "오늘 뭐해?"},
            ],
        )


if __name__ == "__main__":
    unittest.main()
