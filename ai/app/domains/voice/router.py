from fastapi import APIRouter, Depends, HTTPException, status

from app.domains.voice.exceptions import VoiceUpdateNotSupportedError
from app.domains.voice.schema import (
    VoiceCreateRequest,
    VoiceCreateResponse,
    VoiceDeleteRequest,
    VoiceMutationResponse,
    VoiceUpdateRequest,
)
from app.domains.voice.service import VoiceService
from app.infra.dashscope import DashScopeVoiceClient


router = APIRouter(prefix="/voice", tags=["voice"])
dashscope_voice_client = DashScopeVoiceClient()


def get_voice_service() -> VoiceService:
    return VoiceService(dashscope_voice_client)


@router.post("", response_model=VoiceCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_voice(
    body: VoiceCreateRequest,
    voice_service: VoiceService = Depends(get_voice_service),
) -> VoiceCreateResponse:
    voice_id = await voice_service.create_voice(body)
    return VoiceCreateResponse(
        message="음성 등록 성공",
        data={"voiceId": voice_id},
    )


@router.put("", response_model=VoiceMutationResponse)
async def update_voice(
    body: VoiceUpdateRequest,
    voice_service: VoiceService = Depends(get_voice_service),
) -> VoiceMutationResponse:
    try:
        await voice_service.update_voice(body)
    except VoiceUpdateNotSupportedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    return VoiceMutationResponse(
        message="음성 수정 성공",
        data={},
    )


@router.delete("", response_model=VoiceMutationResponse)
async def delete_voice(
    body: VoiceDeleteRequest,
    voice_service: VoiceService = Depends(get_voice_service),
) -> VoiceMutationResponse:
    await voice_service.delete_voice(body.voiceId)
    return VoiceMutationResponse(
        message="음성 삭제 성공",
        data={},
    )
