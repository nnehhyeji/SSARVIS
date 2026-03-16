from fastapi import APIRouter, Body, Depends, Header, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.domains.voice.exceptions import VoiceNotFoundError
from app.domains.voice.repository import VoiceRepository
from app.domains.voice.schema import VoiceCreateItem, VoiceResponse
from app.domains.voice.service import VoiceService
from app.infra.dashscope import DashScopeVoiceClient


router = APIRouter(prefix="/voices", tags=["voices"])
dashscope_voice_client = DashScopeVoiceClient()


def _get_user_id(x_user_id: str = Header(...)) -> str:
    user_id = x_user_id.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header is required")
    return user_id


@router.post("", response_model=list[VoiceResponse], status_code=status.HTTP_201_CREATED)
async def create_voices(
    body: list[VoiceCreateItem] = Body(...),
    x_user_id: str = Header(...),
    session: AsyncSession = Depends(get_db_session),
) -> list[VoiceResponse]:
    user_id = _get_user_id(x_user_id)
    if not body:
        raise HTTPException(status_code=400, detail="At least one voice item is required")
    voice_service = VoiceService(VoiceRepository(session), dashscope_voice_client)
    voices = await voice_service.create_voices(user_id, body)
    return [VoiceResponse.model_validate(voice) for voice in voices]


@router.get("", response_model=list[VoiceResponse])
async def list_voices(
    x_user_id: str = Header(...),
    session: AsyncSession = Depends(get_db_session),
) -> list[VoiceResponse]:
    user_id = _get_user_id(x_user_id)
    voice_service = VoiceService(VoiceRepository(session), dashscope_voice_client)
    voices = await voice_service.list_voices(user_id)
    return [VoiceResponse.model_validate(voice) for voice in voices]


@router.delete("/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice(
    voice_id: str,
    x_user_id: str = Header(...),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    user_id = _get_user_id(x_user_id)
    voice_service = VoiceService(VoiceRepository(session), dashscope_voice_client)
    try:
        await voice_service.delete_voice(user_id, voice_id)
    except VoiceNotFoundError:
        raise HTTPException(status_code=404, detail="Voice not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
