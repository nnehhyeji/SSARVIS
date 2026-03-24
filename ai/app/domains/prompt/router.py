from fastapi import APIRouter, Depends, status

from app.domains.prompt.schema import PromptRequest, PromptResponse
from app.domains.prompt.service import PromptService
from app.infra.openai import OpenAIClient
from app.prompts import SYSTEM_PROMPT_META, SYSTEM_PROMPT_UPDATE_META


router = APIRouter(prefix="/prompt", tags=["prompt"])
openai_client = OpenAIClient()


def get_openai_client() -> OpenAIClient:
    return openai_client


def get_prompt_service(
    client: OpenAIClient = Depends(get_openai_client),
) -> PromptService:
    return PromptService(
        client,
        prompt_meta=SYSTEM_PROMPT_META,
        prompt_update_meta=SYSTEM_PROMPT_UPDATE_META,
    )


@router.post("", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    body: PromptRequest,
    service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    system_prompt = await service.generate_prompt(body)
    return PromptResponse(
        message="시스템 프롬프트 생성 성공",
        data={"systemPrompt": system_prompt},
    )
