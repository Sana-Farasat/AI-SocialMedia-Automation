from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models import Analytics, Post, Schedule, SocialAccount, User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def dashboard_overview(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Aggregate dashboard overview counts."""
    now = datetime.now(timezone.utc)

    connected = await session.scalar(
        select(func.count(SocialAccount.id)).where(
            SocialAccount.user_id == user.id, SocialAccount.is_connected == True  # noqa: E712
        )
    )
    scheduled = await session.scalar(
        select(func.count(Schedule.id)).where(
            Schedule.user_id == user.id, Schedule.status == "scheduled"
        )
    )
    drafts = await session.scalar(
        select(func.count(Post.id)).where(Post.user_id == user.id, Post.status == "draft")
    )
    published = await session.scalar(
        select(func.count(Post.id)).where(Post.user_id == user.id, Post.status == "published")
    )
    failed = await session.scalar(
        select(func.count(Post.id)).where(Post.user_id == user.id, Post.status == "failed")
    )

    recent_result = await session.execute(
        select(Post)
        .where(Post.user_id == user.id)
        .order_by(Post.created_at.desc())
        .limit(10)
    )
    recent = recent_result.scalars().all()

    return {
        "connected_accounts": connected or 0,
        "scheduled_posts": scheduled or 0,
        "published_posts": published or 0,
        "failed_posts": failed or 0,
        "drafts": drafts or 0,
        "recent_activity": [
            {
                "id": p.id,
                "status": p.status,
                "text": (p.text or "")[:80],
                "created_at": p.created_at.isoformat(),
            }
            for p in recent
        ],
    }


@router.get("")
async def list_analytics(
    platform: str | None = None,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = select(Analytics).where(Analytics.user_id == user.id)
    if platform:
        stmt = stmt.where(Analytics.platform == platform)
    stmt = stmt.order_by(Analytics.created_at.desc()).limit(200)
    result = await session.execute(stmt)
    return [a.model_dump() for a in result.scalars().all()]
