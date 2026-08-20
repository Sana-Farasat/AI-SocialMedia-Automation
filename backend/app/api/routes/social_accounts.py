from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user
from app.integrations import registry
from app.db.session import get_session
from app.models import SocialAccount, SocialToken, User
from app.schemas.social import (
    OAuthStartResponse,
    PlatformStatus,
    SocialAccountDisconnect,
    SocialAccountPublic,
)
from app.services.social import (
    create_oauth_state,
    get_platform_statuses,
    save_connected_account,
    verify_oauth_state,
)
from app.services.audit import write_audit_log

router = APIRouter(prefix="/social-accounts", tags=["social-accounts"])


@router.get("/platforms", response_model=list[PlatformStatus])
async def platform_statuses(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return await get_platform_statuses(session, user.id)


@router.get("", response_model=list[SocialAccountPublic])
async def list_accounts(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(SocialAccount).where(SocialAccount.user_id == user.id).order_by(SocialAccount.platform)
    )
    return result.scalars().all()


@router.post("/connect", response_model=OAuthStartResponse)
async def start_connect(
    platform: str = Query(...),
    redirect_uri: str = Query(...),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not registry.has(platform):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unsupported platform: {platform}")
    provider = registry.get(platform)
    if not provider.configurable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{platform} is not configured. Add its OAuth credentials/environment variables to enable it.",
        )
    state = create_oauth_state(user.id, platform)
    auth_url = provider.get_auth_url(state, redirect_uri)
    return OAuthStartResponse(auth_url=auth_url, state=state)


@router.get("/callback", response_model=SocialAccountPublic)
async def oauth_callback(
    platform: str = Query(...),
    code: Optional[str] = Query(default=None),
    state: str = Query(...),
    error: Optional[str] = Query(default=None),
    redirect_uri: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code")
    try:
        verify_oauth_state(state, user.id, platform)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    provider = registry.get(platform)
    if not provider.configurable:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Platform not configured")

    redirect = redirect_uri
    exchanged = await provider.exchange_code(code, redirect, state)
    account = exchanged.get("account")
    if account is None:
        # Fetch the account profile using the fresh access token.
        access_token = exchanged.get("access_token")
        account = await provider.get_account(
            access_token,
            user_id=exchanged.get("user_id"),
        )
    tokens = {k: v for k, v in exchanged.items() if k != "account" and v is not None}
    social = await save_connected_account(session, user, platform, account, tokens)
    await write_audit_log(
        session, user_id=user.id, action=f"social.connect.{platform}", entity_id=social.id
    )
    return social


@router.get("/{account_id}", response_model=SocialAccountPublic)
async def get_account_detail(
    account_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    social = await _owned(session, user.id, account_id)
    return social


@router.post("/{account_id}/disconnect", response_model=SocialAccountDisconnect)
async def disconnect_account(
    account_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    social = await _owned(session, user.id, account_id)
    social.is_connected = False
    token_result = await session.execute(select(SocialToken).where(SocialToken.social_account_id == social.id))
    for token in token_result.scalars().all():
        token.revoked = True
    session.add(social)
    await session.commit()
    await write_audit_log(session, user_id=user.id, action=f"social.disconnect.{social.platform}", entity_id=social.id)
    return SocialAccountDisconnect()


async def _owned(session: AsyncSession, user_id: str, account_id: str) -> SocialAccount:
    social = await session.get(SocialAccount, account_id)
    if not social or social.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Social account not found")
    return social
