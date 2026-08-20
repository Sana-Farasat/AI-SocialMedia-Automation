from datetime import datetime
from typing import Optional

from sqlmodel import Field

from app.models.base import BaseModel, utcnow


class SocialAccount(BaseModel, table=True):
    """A connected social account/page owned by a user."""

    __tablename__ = "social_accounts"

    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    platform: str = Field(index=True, nullable=False)  # instagram|facebook|linkedin|twitter|pinterest|tiktok|youtube|threads
    provider_account_id: str = Field(index=True, nullable=False)
    display_name: Optional[str] = Field(default=None)
    username: Optional[str] = Field(default=None)
    avatar_url: Optional[str] = Field(default=None)
    page_type: Optional[str] = Field(default=None)  # personal | page | channel | etc
    is_connected: bool = Field(default=False)
    last_synced_at: Optional[datetime] = Field(default=None)


class SocialToken(BaseModel, table=True):
    """OAuth token(s) for a social account. Stored server-side only, encrypted at rest in production."""

    __tablename__ = "social_tokens"

    social_account_id: str = Field(foreign_key="social_accounts.id", index=True, nullable=False)
    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    platform: str = Field(index=True, nullable=False)
    access_token: Optional[str] = Field(default=None)
    refresh_token: Optional[str] = Field(default=None)
    token_type: Optional[str] = Field(default=None)
    scope: Optional[str] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    revoked: bool = Field(default=False)
