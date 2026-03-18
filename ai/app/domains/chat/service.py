import asyncio
import logging

from pydantic import ValidationError

from app.config.chat import chat_config
from app.domains.chat.exceptions import PromptNotFoundError
from app.domains.chat.repository import ChatRepository
from app.domains.chat.schema import ChatContext, ConversationContextItem
from app.domains.prompt.repository import PromptRepository
from app.infra.openai import OpenAIClient
from app.infra.prompt_loader import PromptTemplateLoader
from app.infra.qdrant import QdrantClient

logger = logging.getLogger(__name__)


class ChatContextBuilder:
    """Build chat context and convert it into LLM messages."""

    def build_context(
        self,
        system_prompt: str,
        user_message: str,
        recent_conversations: list[dict] | list[ConversationContextItem] | None = None,
        similar_conversations: list[dict] | list[ConversationContextItem] | None = None,
    ) -> ChatContext:
        return ChatContext(
            system_prompt=system_prompt,
            user_message=user_message,
            recent_conversations=self._normalize_conversations(recent_conversations),
            similar_conversations=self._normalize_conversations(similar_conversations),
        )

    def build_messages(
        self,
        context: ChatContext,
        similar_conversations_prefix: str | None = None,
        response_guideline_prompt: str | None = None,
    ) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": context.system_prompt}
        ]

        for conversation in context.recent_conversations:
            messages.append({"role": "user", "content": conversation.user_message})
            messages.append(
                {"role": "assistant", "content": conversation.assistant_message}
            )

        messages.append({"role": "user", "content": context.user_message})

        if context.similar_conversations:
            similar_text = self._build_similar_conversations_text(
                context.similar_conversations,
                similar_conversations_prefix,
            )
            messages.append({"role": "system", "content": similar_text})

        if response_guideline_prompt:
            messages.append({"role": "system", "content": response_guideline_prompt})

        return messages

    def _normalize_conversations(
        self,
        conversations: list[dict] | list[ConversationContextItem] | None,
    ) -> list[ConversationContextItem]:
        if not conversations:
            return []

        return [
            conversation
            if isinstance(conversation, ConversationContextItem)
            else ConversationContextItem.model_validate(conversation)
            for conversation in conversations
        ]

    def _build_similar_conversations_text(
        self,
        conversations: list[ConversationContextItem],
        prefix: str | None,
    ) -> str:
        text = prefix or ""

        for conversation in conversations:
            text += (
                f"Q: {conversation.user_message}\n"
                f"A: {conversation.assistant_message}\n\n"
            )

        return text.strip()


class ChatService:
    def __init__(
        self,
        prompt_repository: PromptRepository,
        chat_repository: ChatRepository,
        openai_client: OpenAIClient,
        qdrant_client: QdrantClient,
        context_builder: ChatContextBuilder | None = None,
        similar_conversations_prefix_loader: PromptTemplateLoader | None = None,
        response_guideline_loader: PromptTemplateLoader | None = None,
    ) -> None:
        self.prompt_repository = prompt_repository
        self.chat_repository = chat_repository
        self.openai_client = openai_client
        self.qdrant_client = qdrant_client
        self.context_builder = context_builder or ChatContextBuilder()
        self.similar_conversations_prefix_loader = (
            similar_conversations_prefix_loader
            or PromptTemplateLoader(chat_config.similar_conversations_prefix_file)
        )
        self.response_guideline_loader = response_guideline_loader or PromptTemplateLoader(
            chat_config.response_guideline_prompt_file
        )

    async def build_context(self, user_id: str, user_message: str) -> ChatContext:
        prompt, recent_conversations, query_vector = await asyncio.gather(
            self.prompt_repository.get_by_user_id(user_id),
            self.chat_repository.get_recent(
                user_id=user_id,
                limit=chat_config.recent_conversations_limit,
            ),
            self.openai_client.embed(user_message),
        )
        if prompt is None:
            raise PromptNotFoundError("Prompt not found")

        similar_conversations = await self.qdrant_client.search(
            vector=query_vector,
            filter_conditions={"user_id": user_id},
            limit=chat_config.similar_conversations_limit,
        )

        return self.context_builder.build_context(
            system_prompt=prompt.prompt,
            user_message=user_message,
            recent_conversations=[
                {
                    "user_message": conversation.user_message,
                    "assistant_message": conversation.assistant_message,
                }
                for conversation in recent_conversations
            ],
            similar_conversations=self._normalize_similar_conversations(
                similar_conversations
            ),
        )

    async def build_messages(
        self,
        user_id: str,
        user_message: str,
    ) -> list[dict[str, str]]:
        context = await self.build_context(user_id=user_id, user_message=user_message)
        return self.context_builder.build_messages(
            context=context,
            similar_conversations_prefix=self.similar_conversations_prefix_loader.load_system_prompt_meta(),
            response_guideline_prompt=self.response_guideline_loader.load_system_prompt_meta(),
        )

    def _normalize_similar_conversations(
        self,
        conversations: list[dict],
    ) -> list[ConversationContextItem]:
        normalized: list[ConversationContextItem] = []

        for conversation in conversations:
            try:
                normalized.append(ConversationContextItem.model_validate(conversation))
            except ValidationError:
                logger.warning("Skipping malformed similar conversation payload")

        return normalized
