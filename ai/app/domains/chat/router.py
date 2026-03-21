import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.domains.chat.exceptions import ChatError
from app.domains.chat.repository import ChatRepository
from app.domains.chat.schema import ChatErrorEvent, ChatEvent, ChatRequest
from app.domains.chat.service import ChatService
from app.domains.voice.service import VoiceService
from app.infra.audio_transcoder import AudioTranscoder
from app.infra.dashscope import DashScopeVoiceClient
from app.infra.openai import OpenAIClient
from app.infra.prompt_loader import PromptTemplateLoader
from app.infra.qdrant import QdrantClient
from app.infra.webm import WebMAudioEncoder, WebMEncodingError


router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

openai_client = OpenAIClient()
dashscope_voice_client = DashScopeVoiceClient()
audio_transcoder = AudioTranscoder()


def get_openai_client() -> OpenAIClient:
    return openai_client


def get_qdrant_client() -> QdrantClient:
    return QdrantClient.get_instance()


def get_dashscope_voice_client() -> DashScopeVoiceClient:
    return dashscope_voice_client


def get_chat_service(
    client: OpenAIClient = Depends(get_openai_client),
    qdrant_client: QdrantClient = Depends(get_qdrant_client),
) -> ChatService:
    return ChatService(
        chat_repository=ChatRepository(qdrant_client),
        openai_client=client,
        similar_conversations_prefix_loader=PromptTemplateLoader(
            "app/prompts/similar_conversations_prefix.md"
        ),
        response_guideline_loader=PromptTemplateLoader(
            "app/prompts/response_guideline.md"
        ),
    )


def get_voice_service(
    dashscope_client: DashScopeVoiceClient = Depends(get_dashscope_voice_client),
) -> VoiceService:
    return VoiceService(dashscope_client, audio_transcoder)


async def _send_error(
    ws: WebSocket,
    detail: str,
    *,
    code: str,
    errors: list[dict] | None = None,
) -> None:
    event = ChatErrorEvent(
        detail=detail,
        payload={
            "code": code,
            "errors": errors or [],
        },
    )
    await ws.send_text(event.model_dump_json())
    await ws.close()


@router.websocket("")
async def chat(
    ws: WebSocket,
    chat_service: ChatService = Depends(get_chat_service),
    voice_service: VoiceService = Depends(get_voice_service),
) -> None:
    await ws.accept()

    try:
        raw = await ws.receive_text()
        try:
            request = ChatRequest.model_validate_json(raw)
        except ValidationError as exc:
            await _send_error(
                ws,
                "Invalid chat request",
                code="invalid_request",
                errors=exc.errors(),
            )
            return

        await ws.send_text(
            ChatEvent(
                type="text.start",
                sessionId=request.sessionId,
                payload={},
            ).model_dump_json()
        )

        preparation = await chat_service.prepare_chat(request)
        assistant_response = await chat_service.openai_client.generate(preparation.messages)
        await chat_service.save_chat(request, assistant_response)

        await ws.send_text(
            ChatEvent(
                type="text.end",
                sessionId=request.sessionId,
                sequence=0,
                payload={"text": assistant_response},
            ).model_dump_json()
        )
        await ws.send_text(
            ChatEvent(
                type="voice.start",
                sessionId=request.sessionId,
                payload={},
            ).model_dump_json()
        )

        encoder = WebMAudioEncoder()
        tts_text = chat_service.sanitize_tts_text(assistant_response)
        pcm_buffer = bytearray()

        async for pcm_chunk in voice_service.synthesize(tts_text, request.voiceId):
            pcm_buffer.extend(pcm_chunk)

        encoded_packets = await encoder.encode_chunks(bytes(pcm_buffer))
        complete_audio = b"".join(encoded_packets)
        sequence = 0

        for packet in encoded_packets:
            await ws.send_text(
                ChatEvent(
                    type="voice.delta",
                    sessionId=request.sessionId,
                    sequence=sequence,
                    payload={
                        "mimeType": "audio/webm",
                    },
                ).model_dump_json()
            )
            await ws.send_bytes(packet)
            sequence += 1

        await ws.send_text(
            ChatEvent(
                type="voice.end",
                sessionId=request.sessionId,
                sequence=sequence,
                payload={
                    "mimeType": "audio/webm",
                },
            ).model_dump_json()
        )
        if complete_audio:
            await ws.send_bytes(complete_audio)
        await ws.close()
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except WebMEncodingError as exc:
        logger.exception("Voice encoding error")
        try:
            await _send_error(
                ws,
                "Failed to encode voice response",
                code="voice_encoding_failed",
                errors=[{"message": str(exc)}],
            )
        except Exception:
            pass
    except ChatError as exc:
        logger.exception("Chat domain error")
        try:
            await _send_error(
                ws,
                str(exc),
                code="chat_error",
            )
        except Exception:
            pass
    except Exception:
        logger.exception("Chat error")
        try:
            await _send_error(ws, "Internal server error", code="internal_error")
        except Exception:
            pass
