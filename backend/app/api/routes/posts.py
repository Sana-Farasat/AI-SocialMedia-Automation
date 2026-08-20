from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models import Media, User
from app.schemas.post import (
    PostCreate,
    PostMediaPublic,
    PostPlatformPublic,
    PostPublic,
    PostSchedule,
    PostUpdate,
)
from app.services.posts import (
    create_post,
    delete_post,
    get_post,
    list_posts,
    list_schedules,
    load_post_platforms,
    schedule_post,
    update_post,
)
from app.services.publishing import publish_post_to_platform

router = APIRouter(prefix="/posts", tags=["posts"])


async def _load_media(session: AsyncSession, post_id: str) -> list[Media]:
    result = await session.execute(
        select(Media)
        .where(Media.post_id == post_id)
        .order_by(Media.created_at.asc())
    )
    return list(result.scalars().all())


async def _to_public(session: AsyncSession, post, platforms):
    public = PostPublic.model_validate(post)
    public.platforms = [PostPlatformPublic.model_validate(p) for p in platforms]
    media = await _load_media(session, post.id)
    public.media = [PostMediaPublic.model_validate(m) for m in media]
    return public


@router.post("", response_model=PostPublic, status_code=status.HTTP_201_CREATED)
async def create_post_endpoint(
    data: PostCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # If asked to "publish now", publish immediately to each selected platform.
    post = await create_post(session, user, data)
    if data.status == "publish_now":
        for pp in await load_post_platforms(session, post):
            await publish_post_to_platform(session, post=post, post_platform=pp, user=user)
        await session.refresh(post)
    platforms = await load_post_platforms(session, post)
    response = await _to_public(session, post, platforms)
    return response


@router.get("", response_model=list[PostPublic])
async def list_posts_endpoint(
    status_filter: str | None = None,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    posts = await list_posts(session, user, status_filter)
    result = []
    for post in posts:
        platforms = await load_post_platforms(session, post)
        result.append(await _to_public(session, post, platforms))
    return result


@router.get("/schedules", response_model=list[dict])
async def list_schedules_endpoint(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    schedules = await list_schedules(session, user)
    return [s.model_dump() for s in schedules]


@router.get("/{post_id}", response_model=PostPublic)
async def get_post_endpoint(
    post_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    post = await get_post(session, user, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    platforms = await load_post_platforms(session, post)
    return await _to_public(session, post, platforms)


@router.patch("/{post_id}", response_model=PostPublic)
async def update_post_endpoint(
    post_id: str,
    data: PostUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    post = await get_post(session, user, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post = await update_post(session, user, post, data)
    platforms = await load_post_platforms(session, post)
    return await _to_public(session, post, platforms)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post_endpoint(
    post_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    post = await get_post(session, user, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await delete_post(session, user, post)
    return None


@router.post("/{post_id}/schedule", response_model=dict)
async def schedule_post_endpoint(
    post_id: str,
    data: PostSchedule,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    post = await get_post(session, user, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    schedule = await schedule_post(session, user, post, data)
    return schedule.model_dump()
