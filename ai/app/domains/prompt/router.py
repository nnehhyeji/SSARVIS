from fastapi import APIRouter, Depends, Header, HTTPException, Response, status

from app.infra.openai import OpenAIClient
from app.infra.prompt_loader import PromptTemplateLoader
from app.domains.prompt.repository import PromptRepository
from app.domains.prompt.schema import PromptRequest, PromptResponse
from app.domains.prompt.service import PromptService


router = APIRouter(prefix="/prompt", tags=["prompt"])
prompt_repository = PromptRepository()
openai_client = OpenAIClient()
prompt_loader = PromptTemplateLoader()
prompt_service = PromptService(prompt_repository, openai_client, prompt_loader)


def get_prompt_service() -> PromptService:
    return prompt_service


def _get_user_id(x_user_id: str = Header(...)) -> str:
    user_id = x_user_id.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header is required")
    return user_id


@router.post("", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    body: PromptRequest,
    user_id: str = Depends(_get_user_id),
    service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    existing = service.get_prompt(user_id)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Prompt already exists")
    prompt = await service.create_prompt(user_id, body)
    return PromptResponse.model_validate(prompt)


@router.get("", response_model=PromptResponse)
async def get_prompt(
    user_id: str = Depends(_get_user_id),
    service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    prompt = service.get_prompt(user_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptResponse.model_validate(prompt)


@router.put("", response_model=PromptResponse)
async def update_prompt(
    body: PromptRequest,
    user_id: str = Depends(_get_user_id),
    service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    prompt = await service.update_prompt(user_id, body)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptResponse.model_validate(prompt)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_prompt(
    user_id: str = Depends(_get_user_id),
    service: PromptService = Depends(get_prompt_service),
) -> Response:
    deleted = service.delete_prompt(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
