from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import ACCESS_TOKEN_COOKIE, get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    get_password_hash,
)
from app.db.session import get_session
from app.models import User
from app.schemas.user import (
    ForgotPasswordRequest,
    MessageResponse,
    PasswordChange,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserPublic,
    UserRegister,
    UserUpdate,
)
from app.services.auth import authenticate_user, get_user_by_email, register_user
from app.services.audit import write_audit_log
from app.services.email import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    response: Response,
    session: AsyncSession = Depends(get_session),
    request: Request = None,
):
    user = await register_user(session, data)
    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    if request:
        request.state.audit_session = session
        await write_audit_log(
            session, user_id=user.id, action="auth.register", ip_address=request.client.host if request.client else None
        )
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    response: Response,
    session: AsyncSession = Depends(get_session),
    request: Request = None,
):
    user = await authenticate_user(session, data.email, data.password)
    user.last_login_at = datetime.now(timezone.utc)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    if request:
        await write_audit_log(
            session, user_id=user.id, action="auth.login", ip_address=request.client.host if request.client else None
        )
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserPublic)
async def read_current_user(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.patch("/me", response_model=UserPublic)
async def update_current_user(
    data: UserUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(current_user, field, value)
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    user = await get_user_by_email(session, data.email)
    if not user or not user.is_active:
        return MessageResponse(
            message="If an account exists with this email, a reset link has been sent."
        )

    token = create_password_reset_token(user.id)
    frontend_url = (settings.FRONTEND_URLS or ["http://localhost:3000"])[0]
    reset_link = f"{frontend_url}/reset-password?token={token}"

    if settings.SMTP_HOST and settings.SMTP_USER:
        try:
            send_password_reset_email(user.email, reset_link)
        except Exception:
            return MessageResponse(
                message="If an account exists with this email, a reset link has been sent."
            )
        await write_audit_log(
            session, user_id=user.id, action="auth.forgot_password"
        )
        return MessageResponse(
            message="If an account exists with this email, a reset link has been sent."
        )

    # SMTP not configured (local dev): surface the link so the flow can be completed.
    await write_audit_log(session, user_id=user.id, action="auth.forgot_password")
    return MessageResponse(
        message=f"Password reset link (SMTP not configured): {reset_link}"
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    user_id = decode_password_reset_token(data.token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link is invalid or has expired",
        )

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link is invalid or has expired",
        )

    user.hashed_password = get_password_hash(data.new_password)
    session.add(user)
    await session.commit()
    await write_audit_log(session, user_id=user.id, action="auth.reset_password")
    return MessageResponse(
        message="Password updated successfully. You can now sign in."
    )


@router.post("/me/change-password", response_model=MessageResponse)
async def change_password(
    data: PasswordChange,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.core.security import get_password_hash, verify_password

    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(data.new_password)
    session.add(current_user)
    await session.commit()
    return MessageResponse(message="Password updated successfully")
