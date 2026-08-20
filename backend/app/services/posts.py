from datetime import datetime, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import Media, Post, PostPlatform, PublishAttempt, Schedule, User
from app.schemas.post import PostCreate, PostSchedule, PostUpdate


async def create_post(session: AsyncSession, user: User, data: PostCreate) -> Post:
    post = Post(
        user_id=user.id,
        text=data.text,
        status=data.status,
    )
    session.add(post)
    await session.flush()

    if data.media_ids:
        for media_id in data.media_ids:
            media = await session.get(Media, media_id)
            if media:
                media.post_id = post.id
                session.add(media)

    for pp in data.platforms:
        post_platform = PostPlatform(
            post_id=post.id,
            platform=pp.platform,
            social_account_id=pp.social_account_id,
            status="scheduled" if data.status in ("scheduled", "publish_now") else "pending",
        )
        session.add(post_platform)

    await session.commit()
    await session.refresh(post)
    return post


async def update_post(session: AsyncSession, user: User, post: Post, data: PostUpdate) -> Post:
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(post, field, value)
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post


async def list_posts(session: AsyncSession, user: User, status: str | None = None) -> list[Post]:
    stmt = select(Post).where(Post.user_id == user.id)
    if status:
        stmt = stmt.where(Post.status == status)
    stmt = stmt.order_by(Post.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


async def get_post(session: AsyncSession, user: User, post_id: str) -> Post | None:
    result = await session.execute(
        select(Post).where(Post.id == post_id, Post.user_id == user.id)
    )
    return result.scalar_one_or_none()


async def schedule_post(
    session: AsyncSession,
    user: User,
    post: Post,
    data: PostSchedule,
) -> Schedule:
    existing = await session.execute(select(Schedule).where(Schedule.post_id == post.id))
    schedule = existing.scalar_one_or_none()
    if schedule is None:
        schedule = Schedule(
            post_id=post.id,
            user_id=user.id,
            scheduled_at=data.scheduled_at,
            timezone=data.timezone,
            status="scheduled",
        )
        session.add(schedule)
    else:
        schedule.scheduled_at = data.scheduled_at
        schedule.timezone = data.timezone
        schedule.status = "scheduled"
        session.add(schedule)

    post.status = "scheduled"
    session.add(post)
    await session.commit()
    await session.refresh(schedule)
    return schedule


async def list_schedules(session: AsyncSession, user: User) -> list[Schedule]:
    result = await session.execute(
        select(Schedule).where(Schedule.user_id == user.id).order_by(Schedule.scheduled_at)
    )
    return result.scalars().all()


async def load_post_platforms(session: AsyncSession, post: Post) -> list[PostPlatform]:
    result = await session.execute(select(PostPlatform).where(PostPlatform.post_id == post.id))
    return result.scalars().all()


async def delete_post(session: AsyncSession, user: User, post: Post) -> None:
    for model in (Schedule, PublishAttempt, PostPlatform):
        result = await session.execute(select(model).where(model.post_id == post.id))
        for row in result.scalars().all():
            await session.delete(row)

    media_result = await session.execute(select(Media).where(Media.post_id == post.id))
    for media in media_result.scalars().all():
        media.post_id = None
        session.add(media)

    await session.delete(post)
    await session.commit()
