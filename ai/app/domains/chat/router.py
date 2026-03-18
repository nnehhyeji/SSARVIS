import json
import logging
from dataclasses import dataclass

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.chat import chat_config
from app.core.database import get_db_session
from app.domains.chat.exceptions import PromptNotFoundError
from app.domains.chat.repository import ChatRepository
from app.domains.chat.schema import ChatRequest
from app.domains.chat.service import ChatService
from app.domains.prompt.repository import PromptRepository
from app.domains.voice.service import VoiceService
from app.domains.voice.repository import VoiceRepository
from app.infra.audio_buffer import PCMChunkCollector
from app.infra.dashscope import DashScopeVoiceClient
from app.infra.openai import OpenAIClient
from app.infra.opus import OpusEncoder
from app.infra.prompt_loader import PromptTemplateLoader
from app.infra.qdrant import QdrantClient
from app.infra.s3compatible import S3CompatibleClient
from app.infra.tts_storage import TTSAudioStorageService


router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

openai_client = OpenAIClient()
dashscope_voice_client = DashScopeVoiceClient()
prompt_prefix_loader = PromptTemplateLoader(chat_config.similar_conversations_prefix_file)
response_guideline_loader = PromptTemplateLoader(chat_config.response_guideline_prompt_file)
s3compatible_client = S3CompatibleClient()


@dataclass
class ChatStreamState:
    assistant_response: str
    text_sent: bool = False

    async def ensure_text_sent(self, ws: WebSocket) -> None:
        if self.text_sent:
            return

        await ws.send_text(
            json.dumps(
                {"type": "text", "content": self.assistant_response},
                ensure_ascii=False,
            )
        )
        self.text_sent = True


def get_openai_client() -> OpenAIClient:
    return openai_client


def get_qdrant_client() -> QdrantClient:
    return QdrantClient.get_instance()


def get_dashscope_voice_client() -> DashScopeVoiceClient:
    return dashscope_voice_client


def get_tts_storage_service() -> TTSAudioStorageService:
    return TTSAudioStorageService(s3compatible_client)


def get_chat_service(
    session: AsyncSession = Depends(get_db_session),
    client: OpenAIClient = Depends(get_openai_client),
    qdrant_client: QdrantClient = Depends(get_qdrant_client),
) -> ChatService:
    return ChatService(
        prompt_repository=PromptRepository(session),
        chat_repository=ChatRepository(session),
        openai_client=client,
        qdrant_client=qdrant_client,
        similar_conversations_prefix_loader=prompt_prefix_loader,
        response_guideline_loader=response_guideline_loader,
    )


def get_voice_service(
    session: AsyncSession = Depends(get_db_session),
    dashscope_client: DashScopeVoiceClient = Depends(get_dashscope_voice_client),
) -> VoiceService:
    return VoiceService(VoiceRepository(session), dashscope_client)


async def _send_error(ws: WebSocket, detail: str) -> None:
    await ws.send_text(json.dumps({"type": "error", "detail": detail}, ensure_ascii=False))
    await ws.close()


@router.websocket("")
async def chat(
    ws: WebSocket,
    chat_service: ChatService = Depends(get_chat_service),
    voice_service: VoiceService = Depends(get_voice_service),
    tts_storage_service: TTSAudioStorageService = Depends(get_tts_storage_service),
) -> None:
    await ws.accept()

    try:
        user_id = (ws.query_params.get("user_id") or "").strip()
        if not user_id:
            await _send_error(ws, "user_id query parameter is required")
            return

        raw = await ws.receive_text()
        try:
            request = ChatRequest.model_validate_json(raw)
        except Exception:
            await _send_error(ws, "Invalid request format. Expected: {message, voice_id}")
            return

        voice = await voice_service.repository.get_by_voice_id(user_id, request.voice_id)
        if voice is None:
            await _send_error(ws, "Invalid voice_id or voice does not belong to this user")
            return

        try:
            preparation = await chat_service.prepare_chat(
                user_id=user_id,
                user_message=request.message,
            )
        except PromptNotFoundError:
            await _send_error(ws, "Prompt not found")
            return

        assistant_response = await chat_service.openai_client.generate(preparation.messages)
        conversation = await chat_service.chat_repository.create(
            user_id=user_id,
            user_message=request.message,
            assistant_message=assistant_response,
        )
        await chat_service.qdrant_client.upsert(
            point_id=conversation.id,
            vector=preparation.query_vector,
            payload={
                "user_id": user_id,
                "user_message": request.message,
                "assistant_message": assistant_response,
            },
        )

        encoder = OpusEncoder()
        collector = PCMChunkCollector()
        tts_text = chat_service.sanitize_tts_text(assistant_response)
        stream_state = ChatStreamState(assistant_response=assistant_response)
        audio_download_url: str | None = None

        async for pcm_chunk in voice_service.synthesize(tts_text, request.voice_id):
            collector.append(pcm_chunk)
            opus_packets = encoder.encode(pcm_chunk)

            if opus_packets:
                await stream_state.ensure_text_sent(ws)

            for packet in opus_packets:
                await ws.send_bytes(packet)

        for packet in encoder.flush():
            await stream_state.ensure_text_sent(ws)
            await ws.send_bytes(packet)

        if not stream_state.text_sent:
            await stream_state.ensure_text_sent(ws)

        if collector:
            uploaded = await tts_storage_service.upload_pcm_as_mp3(
                user_id=user_id,
                conversation_id=conversation.id,
                pcm_data=collector.to_bytes(),
            )
            audio_download_url = uploaded.download_url
            await chat_service.chat_repository.set_tts_asset(
                conversation_id=conversation.id,
                file_name=uploaded.file_name,
                s3_object_key=uploaded.object_key,
            )

        await ws.send_text(
            json.dumps(
                {"type": "done", "audio_download_url": audio_download_url},
                ensure_ascii=False,
            )
        )
        await ws.close()
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as exc:
        logger.exception("Chat error")
        try:
            await _send_error(ws, f"Internal server error: {exc}")
        except Exception:
            pass
