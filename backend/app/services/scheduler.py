from datetime import datetime, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import Post, PostPlatform, Schedule, User
from app.services.publishing import publish_post_to_platform


async def process_due_schedules(session: AsyncSession) -> dict:
    """Publish every scheduled post that is due.

    Shared by the background worker and the HTTP-triggered endpoint so both
    use the same publishing logic.
    """
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(Schedule).where(
            Schedule.status == "scheduled",
            Schedule.scheduled_at <= now,
        )
    )
    due = result.scalars().all()

    stats = {"processed": 0, "published": 0, "failed": 0}

    for schedule in due:
        stats["processed"] += 1
        schedule.status = "processing"
        schedule.fired_at = now
        session.add(schedule)
        await session.commit()

        post = await session.get(Post, schedule.post_id)
        user = await session.get(User, schedule.user_id)
        if not post or not user:
            schedule.status = "failed"
            session.add(schedule)
            await session.commit()
            stats["failed"] += 1
            continue

        platforms = await session.execute(
            select(PostPlatform).where(
                PostPlatform.post_id == post.id,
                PostPlatform.status.in_(["scheduled", "pending"]),
            )
        )
        post_platforms = platforms.scalars().all()
        if not post_platforms:
            schedule.status = "failed"
            session.add(schedule)
            await session.commit()
            stats["failed"] += 1
            continue

        failures = 0
        for pp in post_platforms:
            pp.status = "processing"
            session.add(pp)
            await session.commit()
            attempt = await publish_post_to_platform(
                session, post=post, post_platform=pp, user=user
            )
            if attempt.status != "success":
                failures += 1

        schedule.status = "published" if failures == 0 else "failed"
        session.add(schedule)
        await session.commit()
        if failures == 0:
            stats["published"] += 1
        else:
            stats["failed"] += 1

    return stats