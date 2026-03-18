import unittest

from app.domains.chat.schema import ChatContext, ConversationContextItem


class ChatContextSchemaTests(unittest.TestCase):
    def test_chat_context_uses_ref_aligned_structure(self) -> None:
        context = ChatContext(
            system_prompt="You are user X",
            user_message="오늘 뭐해?",
            recent_conversations=[
                ConversationContextItem(
                    user_message="안녕",
                    assistant_message="반가워",
                )
            ],
            similar_conversations=[
                ConversationContextItem(
                    user_message="주말 계획?",
                    assistant_message="쉬려고",
                )
            ],
        )

        self.assertEqual(context.system_prompt, "You are user X")
        self.assertEqual(context.user_message, "오늘 뭐해?")
        self.assertEqual(context.recent_conversations[0].user_message, "안녕")
        self.assertEqual(context.similar_conversations[0].assistant_message, "쉬려고")

    def test_chat_context_defaults_conversation_lists(self) -> None:
        context = ChatContext(
            system_prompt="You are user X",
            user_message="오늘 뭐해?",
        )

        self.assertEqual(context.recent_conversations, [])
        self.assertEqual(context.similar_conversations, [])


if __name__ == "__main__":
    unittest.main()
