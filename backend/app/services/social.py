import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.integrations import registry
from app.integrations.base import ProviderAccount
from app.models import SocialAccount, SocialToken, User
from app.schemas.social import PlatformStatus

STATE_ALGORITHM = "HS256"
STATE_TTL = timedelta(minutes=10)


def create_oauth_state(user_id: str, platform: str) -> str:
    payload = {
        "user_id": user_id,
        "platform": platform,
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.now(timezone.utc) + STATE_TTL,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=STATE_ALGORITHM)


def verify_oauth_state(state: str, user_id: str, platform: str) -> None:
    """Raises ValueError if the state is invalid/expired/mismatched (CSRF protection)."""
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[STATE_ALGORITHM])
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Invalid OAuth state") from exc
    if payload.get("user_id") != user_id or payload.get("platform") != platform:
        raise ValueError("OAuth state mismatch")


async def get_platform_statuses(session: AsyncSession, user_id: str) -> list[PlatformStatus]:
    result = await session.execute(select(SocialAccount).where(SocialAccount.user_id == user_id))
    accounts = result.scalars().all()
    counts: dict[str, int] = {}
    for acc in accounts:
        counts[acc.platform] = counts.get(acc.platform, 0) + 1
    statuses = []
    for platform in registry.available():
        provider = registry.get(platform)
        statuses.append(
            PlatformStatus(
                platform=platform,
                configurable=provider.configurable,
                supports_oauth=True,
                connected_accounts=counts.get(platform, 0),
            )
        )
    return statuses


async def save_connected_account(
    session: AsyncSession,
    user: User,
    platform: str,
    account: ProviderAccount,
    tokens: dict,
) -> SocialAccount:
    """Upsert a SocialAccount + SocialToken from an OAuth exchange result."""
    result = await session.execute(
        select(SocialAccount).where(
            SocialAccount.user_id == user.id,
            SocialAccount.platform == platform,
            SocialAccount.provider_account_id == account.provider_account_id,
        )
    )
    social = result.scalar_one_or_none()
    if social is None:
        social = SocialAccount(
            user_id=user.id,
            platform=platform,
            provider_account_id=account.provider_account_id,
            display_name=account.display_name,
            username=account.username,
            avatar_url=account.avatar_url,
            page_type=account.page_type,
            is_connected=True,
            last_synced_at=datetime.now(timezone.utc),
        )
        session.add(social)
        await session.flush()
    else:
        social.display_name = account.display_name
        social.username = account.username
        social.avatar_url = account.avatar_url
        social.page_type = account.page_type
        social.is_connected = True
        social.last_synced_at = datetime.now(timezone.utc)

    token_result = await session.execute(
        select(SocialToken).where(SocialToken.social_account_id == social.id)
    )
    token = token_result.scalar_one_or_none()
    if token is None:
        token = SocialToken(
            social_account_id=social.id,
            user_id=user.id,
            platform=platform,
        )
        session.add(token)
    token.access_token = tokens.get("access_token")
    token.refresh_token = tokens.get("refresh_token")
    token.expires_at = _compute_expiry(tokens.get("expires_in"))

    await session.commit()
    await session.refresh(social)
    return social


def _compute_expiry(expires_in: Optional[int]) -> Optional[datetime]:
    if not expires_in:
        return None
    try:
        return datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
    except (TypeError, ValueError):
        return None
