import asyncio

from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.integrations import registry
from app.integrations.errors import SocialPublishError, TokenExpiredError
from app.models import (
    Media,
    Post,
    PostPlatform,
    PublishAttempt,
    SocialAccount,
    SocialToken,
    User,
)

MAX_RETRIES = 4
BASE_BACKOFF_SECONDS = 5


async def _backoff_sleep(seconds: float) -> None:
    await asyncio.sleep(seconds)


def _is_retryable(error: Exception) -> bool:
    return isinstance(error, SocialPublishError) and error.retryable


async def _load_token(session: AsyncSession, social_account_id: str) -> SocialToken | None:
    result = await session.execute(
        select(SocialToken).where(
            SocialToken.social_account_id == social_account_id,
            SocialToken.revoked == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


def _compute_expiry(expires_in) -> object | None:
    if not expires_in:
        return None
    try:
        from datetime import datetime, timedelta, timezone

        return datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
    except (TypeError, ValueError):
        return None


async def _refresh_stored_token(
    session: AsyncSession,
    provider,
    token: SocialToken,
) -> None:
    new_tokens = await provider.refresh_token(token.refresh_token or token.access_token)
    token.access_token = new_tokens.get("access_token") or token.access_token
    token.refresh_token = new_tokens.get("refresh_token") or token.refresh_token
    token.expires_at = _compute_expiry(new_tokens.get("expires_in"))
    session.add(token)
    await session.commit()


async def _load_media_urls(session: AsyncSession, post_id: str) -> list[str]:
    result = await session.execute(select(Media).where(Media.post_id == post_id))
    return [m.public_url for m in result.scalars().all() if m.public_url]


async def publish_post_to_platform(
    session: AsyncSession,
    *,
    post: Post,
    post_platform: PostPlatform,
    user: User,
) -> PublishAttempt:
    """Publish a post to one platform with retry + backoff. Always records an attempt
    and updates post_platform.status + post.status, then commits.

    The returned PublishAttempt.status tells the caller success/failure.
    """
    social = await session.get(SocialAccount, post_platform.social_account_id)
    if not social or not social.is_connected:
        return await _fail(
            session, post, post_platform, user,
            error_message="No connected social account for this platform",
            is_retryable=False,
        )

    token = await _load_token(session, social.id)
    if not token or not token.access_token:
        return await _fail(
            session, post, post_platform, user,
            error_message="No access token stored for this account",
            is_retryable=False,
        )

    provider = registry.get(post_platform.platform)
    media_urls = await _load_media_urls(session, post.id)

    last_error: Exception | None = None
    retryable = False
    attempt_number = 0
    retry_count = 0
    refreshed = False

    for retry_count in range(MAX_RETRIES + 1):
        try:
            result = await provider.publish_post(token.access_token, post.text or "", media_urls)
            post_platform.status = "published"
            post_platform.platform_post_id = result.provider_post_id
            post_platform.platform_url = result.url
            post_platform.error_message = None
            session.add(post_platform)
            await _maybe_mark_post_published(session, post)
            attempt = PublishAttempt(
                post_id=post.id,
                post_platform_id=post_platform.id,
                user_id=user.id,
                platform=post_platform.platform,
                social_account_id=post_platform.social_account_id,
                status="success",
                attempt_number=retry_count + 1,
                retry_count=retry_count,
            )
            session.add(attempt)
            await session.commit()
            return attempt

        except TokenExpiredError as exc:
            if token.refresh_token and not refreshed:
                await _refresh_stored_token(session, provider, token)
                refreshed = True
                continue
            last_error = exc
            retryable = True
            break

        except Exception as exc:  # noqa: BLE001
            last_error = exc
            retryable = _is_retryable(exc)
            if not retryable or retry_count >= MAX_RETRIES:
                break
            await _backoff_sleep(BASE_BACKOFF_SECONDS * (2 ** retry_count))

    code = getattr(last_error, "code", "UNKNOWN")
    return await _fail(
        session, post, post_platform, user,
        error_code=code,
        error_message=str(last_error),
        is_retryable=retryable,
        attempt_number=retry_count + 1,
        retry_count=retry_count,
    )


async def _fail(
    session: AsyncSession,
    post: Post,
    post_platform: PostPlatform,
    user: User,
    *,
    error_code: str | None = None,
    error_message: str,
    is_retryable: bool,
    attempt_number: int = 1,
    retry_count: int = 0,
) -> PublishAttempt:
    post_platform.status = "failed"
    post_platform.error_message = error_message
    session.add(post_platform)
    await _maybe_mark_post_failed(session, post)
    attempt = PublishAttempt(
        post_id=post.id,
        post_platform_id=post_platform.id,
        user_id=user.id,
        platform=post_platform.platform,
        social_account_id=post_platform.social_account_id,
        status="failed",
        attempt_number=attempt_number,
        retry_count=retry_count,
        error_code=error_code,
        error_message=error_message,
        is_retryable=is_retryable,
    )
    session.add(attempt)
    await session.commit()
    return attempt


async def _maybe_mark_post_published(session: AsyncSession, post: Post) -> None:
    if await _all_platforms_in_state(session, post.id, "published"):
        post.status = "published"
        session.add(post)


async def _maybe_mark_post_failed(session: AsyncSession, post: Post) -> None:
    if await _all_platforms_in_state(session, post.id, "failed"):
        post.status = "failed"
        session.add(post)


async def _all_platforms_in_state(session: AsyncSession, post_id: str, state: str) -> bool:
    total = await session.scalar(
        select(func.count(PostPlatform.id)).where(
            PostPlatform.post_id == post_id,
            PostPlatform.status != "cancelled",
        )
    )
    done = await session.scalar(
        select(func.count(PostPlatform.id)).where(
            PostPlatform.post_id == post_id,
            PostPlatform.status == state,
        )
    )
    return bool(total) and total == done
