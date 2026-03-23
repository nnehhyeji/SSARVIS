import logging
import re
from dataclasses import dataclass

from app.config.chat import chat_config
from app.domains.chat.repository import ChatRepository
from app.domains.chat.schema import ChatContext, ChatHistoryItem, ChatRequest, SimilarChatItem
from app.infra.openai import OpenAIClient
from app.infra.prompt_loader import PromptTemplateLoader

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatPreparation:
    context: ChatContext
    messages: list[dict[str, str]]
    query_vector: list[float]


class ChatContextBuilder:
    def build_context(
        self,
        system_prompt: str,
        user_text: str,
        history: list[dict] | list[ChatHistoryItem] | None = None,
        similar_conversations: list[dict] | list[SimilarChatItem] | None = None,
    ) -> ChatContext:
        return ChatContext(
            system_prompt=system_prompt,
            history=self._normalize_history(history),
            user_text=user_text,
            similar_conversations=self._normalize_similar_conversations(
                similar_conversations
            ),
        )

    def build_messages(
        self,
        context: ChatContext,
        similar_conversations_prefix: str | None = None,
        response_guideline_prompt: str | None = None,
        public_conversation_guideline_prompt: str | None = None,
    ) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": context.system_prompt}
        ]

        for history_item in context.history:
            messages.append({"role": history_item.role, "content": history_item.content})

        if context.similar_conversations:
            similar_text = self._build_similar_conversations_text(
                context.similar_conversations,
                similar_conversations_prefix,
            )
            messages.append({"role": "system", "content": similar_text})

        if response_guideline_prompt:
            messages.append({"role": "system", "content": response_guideline_prompt})

        if public_conversation_guideline_prompt:
            messages.append(
                {"role": "system", "content": public_conversation_guideline_prompt}
            )

        messages.append({"role": "user", "content": context.user_text})
        return messages

    def _normalize_history(
        self,
        history: list[dict] | list[ChatHistoryItem] | None,
    ) -> list[ChatHistoryItem]:
        if not history:
            return []

        return [
            item
            if isinstance(item, ChatHistoryItem)
            else ChatHistoryItem.model_validate(item)
            for item in history
        ]

    def _normalize_similar_conversations(
        self,
        conversations: list[dict] | list[SimilarChatItem] | None,
    ) -> list[SimilarChatItem]:
        if not conversations:
            return []

        return [
            item
            if isinstance(item, SimilarChatItem)
            else SimilarChatItem.model_validate(item)
            for item in conversations
        ]

    def _build_similar_conversations_text(
        self,
        conversations: list[SimilarChatItem],
        prefix: str | None,
    ) -> str:
        text = prefix or ""
        for conversation in conversations:
            text += (
                f"Q: {conversation.text}\n"
                f"A: {conversation.response}\n\n"
            )
        return text.strip()


class ChatService:
    def __init__(
        self,
        chat_repository: ChatRepository,
        openai_client: OpenAIClient,
        context_builder: ChatContextBuilder | None = None,
        similar_conversations_prefix_loader: PromptTemplateLoader | None = None,
        response_guideline_loader: PromptTemplateLoader | None = None,
        public_conversation_guideline_loader: PromptTemplateLoader | None = None,
    ) -> None:
        self.chat_repository = chat_repository
        self.openai_client = openai_client
        self.context_builder = context_builder or ChatContextBuilder()
        self.similar_conversations_prefix_loader = (
            similar_conversations_prefix_loader
            or PromptTemplateLoader(chat_config.similar_conversations_prefix_file)
        )
        self.response_guideline_loader = response_guideline_loader or PromptTemplateLoader(
            chat_config.response_guideline_prompt_file
        )
        self.public_conversation_guideline_loader = (
            public_conversation_guideline_loader
            or PromptTemplateLoader(chat_config.public_conversation_guideline_prompt_file)
        )

    async def prepare_chat(self, request: ChatRequest) -> ChatPreparation:
        query_vector = await self.openai_client.embed(
            self.build_query_embedding_text(request.text)
        )
        similar_conversations = await self.chat_repository.search_similar(
            session_id=request.sessionId,
            user_id=request.userId,
            chat_mode=request.chatMode,
            memory_policy=request.memoryPolicy,
            vector=query_vector,
            limit=chat_config.similar_conversations_limit,
        )
        context = self.context_builder.build_context(
            system_prompt=request.systemPrompt,
            user_text=request.text,
            history=request.history,
            similar_conversations=similar_conversations,
        )
        messages = self.context_builder.build_messages(
            context=context,
            similar_conversations_prefix=self.similar_conversations_prefix_loader.load_system_prompt_meta(),
            response_guideline_prompt=self.response_guideline_loader.load_system_prompt_meta(),
            public_conversation_guideline_prompt=(
                self.public_conversation_guideline_loader.load_system_prompt_meta()
                if request.isPublic
                else None
            ),
        )
        return ChatPreparation(
            context=context,
            messages=messages,
            query_vector=query_vector,
        )

    async def save_chat(self, request: ChatRequest, response: str) -> SimilarChatItem:
        embedding = await self.openai_client.embed(
            self.build_storage_embedding_text(request.text, response)
        )
        return await self.chat_repository.save_chat(
            session_id=request.sessionId,
            user_id=request.userId,
            chat_mode=request.chatMode,
            memory_policy=request.memoryPolicy,
            text=request.text,
            response=response,
            vector=embedding,
        )

    @staticmethod
    def sanitize_tts_text(text: str) -> str:
        sanitized = re.sub(r"\(.*?\)|\[.*?\]|（.*?）|［.*?］", "", text).strip()
        return sanitized or text

    @staticmethod
    def build_query_embedding_text(text: str) -> str:
        return f"Q: {text}"

    @staticmethod
    def build_storage_embedding_text(text: str, response: str) -> str:
        return f"Q: {text}\nA: {response}"
