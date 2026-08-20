from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.models import User
from app.services.ai.service import (
    GenerateRequest,
    GenerateResponse,
    RewriteRequest,
    ai_service,
)

router = APIRouter(prefix="/ai", tags=["ai"])


def _guard():
    if not settings.OPENAI_API_KEY and not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI is not configured. Set OPENAI_API_KEY or GEMINI_API_KEY.",
        )


@router.post("/generate", response_model=GenerateResponse)
async def generate_content(
    req: GenerateRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _guard()
    return await ai_service.generate(session, user, req)


@router.post("/rewrite", response_model=GenerateResponse)
async def rewrite_content(
    req: RewriteRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _guard()
    return await ai_service.rewrite(session, user, req)


@router.post("/ideas", response_model=GenerateResponse)
async def content_ideas(
    req: GenerateRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _guard()
    return await ai_service.ideas(session, user, req)


@router.post("/hashtags", response_model=GenerateResponse)
async def hashtag_suggestions(
    req: GenerateRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _guard()
    return await ai_service.hashtags(session, user, req)
