import uuid

import pytest
import pytest_asyncio

from app.services.publishing import publish_post_to_platform


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_publish_success_records_attempt_and_publishes(monkeypatch):
    from sqlmodel import select
    from app.integrations import registry
    from app.models import Post, PostPlatform, PublishAttempt, SocialAccount, SocialToken, User

    # Set up a connected account + token for a platform so publish proceeds.
    async with _session() as session:
        from app.core.security import get_password_hash
        u = User(email=f"pub{uuid.uuid4().hex[:6]}@t.com", hashed_password=get_password_hash("x"))
        session.add(u)
        await session.flush()
        user = u
        acct = SocialAccount(
            user_id=user.id, platform="twitter", provider_account_id="acc1",
            display_name="Acc", is_connected=True,
        )
        session.add(acct)
        await session.flush()
        token = SocialToken(
            social_account_id=acct.id, user_id=user.id, platform="twitter",
            access_token="tok",
        )
        session.add(token)
        post = Post(user_id=user.id, text="Hi")
        session.add(post)
        await session.flush()
        pp = PostPlatform(post_id=post.id, platform="twitter", social_account_id=acct.id, status="scheduled")
        session.add(pp)
        await session.commit()
        pid, ppid = post.id, pp.id

    # Mock the provider to succeed.
    class FakeResult:
        provider_post_id = "123"
        url = "https://x.com/i/status/123"

    class FakeProvider:
        async def publish_post(self, acc, text, media_urls=None):
            return FakeResult()

    monkeypatch.setitem(registry._providers, "twitter", lambda: FakeProvider())

    async with _session() as session:
        post = await session.get(Post, pid)
        pp = await session.get(PostPlatform, ppid)
        user = (await session.execute(select(User).where(User.id == post.user_id))).scalar_one()
        attempt = await publish_post_to_platform(session, post=post, post_platform=pp, user=user)
        assert attempt.status == "success"
        assert attempt.retry_count == 0
        assert pp.status == "published"

    await _cleanup([pid])


@pytest.mark.anyio
async def test_publish_retryable_then_success(monkeypatch):
    from sqlmodel import select
    from app.integrations import registry
    from app.integrations.errors import RateLimitError
    from app.models import Post, PostPlatform, SocialAccount, SocialToken, User
    from app.services import publishing

    async with _session() as session:
        from app.core.security import get_password_hash
        u = User(email=f"pub{uuid.uuid4().hex[:6]}@t.com", hashed_password=get_password_hash("x"))
        session.add(u)
        await session.flush()
        user = u
        acct = SocialAccount(user_id=user.id, platform="twitter", provider_account_id="acc2", is_connected=True)
        session.add(acct)
        await session.flush()
        token = SocialToken(social_account_id=acct.id, user_id=user.id, platform="twitter", access_token="tok")
        session.add(token)
        post = Post(user_id=user.id, text="Hi")
        session.add(post)
        await session.flush()
        pp = PostPlatform(post_id=post.id, platform="twitter", social_account_id=acct.id, status="scheduled")
        session.add(pp)
        await session.commit()
        pid, ppid = post.id, pp.id

    calls = {"n": 0}

    class FakeResult:
        provider_post_id = "456"
        url = "https://x.com/i/status/456"

    class FakeProvider:
        async def publish_post(self, acc, text, media_urls=None):
            calls["n"] += 1
            if calls["n"] < 3:
                raise RateLimitError()
            return FakeResult()

    monkeypatch.setitem(registry._providers, "twitter", lambda: FakeProvider())
    # speed up backoff
    async def fast_sleep(_):
        return None
    monkeypatch.setattr(publishing, "_backoff_sleep", fast_sleep)

    async with _session() as session:
        post = await session.get(Post, pid)
        pp = await session.get(PostPlatform, ppid)
        user = (await session.execute(select(User).where(User.id == post.user_id))).scalar_one()
        attempt = await publish_post_to_platform(session, post=post, post_platform=pp, user=user)
        assert attempt.status == "success"
        assert calls["n"] == 3
        assert attempt.retry_count == 2
        assert pp.status == "published"

    await _cleanup([pid])


@pytest.mark.anyio
async def test_publish_permanent_error_no_retry(monkeypatch):
    from sqlmodel import select
    from app.integrations import registry
    from app.integrations.errors import TokenInvalidError
    from app.models import Post, PostPlatform, SocialAccount, SocialToken, User
    from app.services import publishing

    async with _session() as session:
        from app.core.security import get_password_hash
        u = User(email=f"pub{uuid.uuid4().hex[:6]}@t.com", hashed_password=get_password_hash("x"))
        session.add(u)
        await session.flush()
        user = u
        acct = SocialAccount(user_id=user.id, platform="pinterest", provider_account_id="acc3", is_connected=True)
        session.add(acct)
        await session.flush()
        token = SocialToken(social_account_id=acct.id, user_id=user.id, platform="pinterest", access_token="tok")
        session.add(token)
        post = Post(user_id=user.id, text="Hi")
        session.add(post)
        await session.flush()
        pp = PostPlatform(post_id=post.id, platform="pinterest", social_account_id=acct.id, status="scheduled")
        session.add(pp)
        await session.commit()
        pid, ppid = post.id, pp.id

    calls = {"n": 0}

    class FakeProvider:
        async def publish_post(self, acc, text, media_urls=None):
            calls["n"] += 1
            raise TokenInvalidError()

    monkeypatch.setitem(registry._providers, "pinterest", lambda: FakeProvider())

    async with _session() as session:
        post = await session.get(Post, pid)
        pp = await session.get(PostPlatform, ppid)
        user = (await session.execute(select(User).where(User.id == post.user_id))).scalar_one()
        attempt = await publish_post_to_platform(session, post=post, post_platform=pp, user=user)
        assert attempt.status == "failed"
        assert attempt.is_retryable is False
        assert calls["n"] == 1  # no retry for permanent errors
        assert pp.status == "failed"

    await _cleanup([pid])


def _session():
    from app.db.session import SessionLocal
    return SessionLocal()


async def _cleanup(post_ids):
    from sqlmodel import delete
    from app.models import Post, PostPlatform, PublishAttempt, Schedule, SocialAccount, SocialToken
    async with _session() as session:
        for pid in post_ids:
            await session.execute(delete(PostPlatform).where(PostPlatform.post_id == pid))
            await session.execute(delete(PublishAttempt).where(PublishAttempt.post_id == pid))
            await session.execute(delete(Schedule).where(Schedule.post_id == pid))
            await session.execute(delete(Post).where(Post.id == pid))
        await session.commit()
