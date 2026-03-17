from fastapi import APIRouter

from app.domains.chat.router import router as chat_router
from app.domains.prompt.router import router as prompt_router
from app.domains.voice.router import router as voice_router


api_router = APIRouter()
api_router.include_router(prompt_router)
api_router.include_router(voice_router)
api_router.include_router(chat_router)
