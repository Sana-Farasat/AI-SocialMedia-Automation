from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SocialAccountPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    platform: str
    provider_account_id: str
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    page_type: Optional[str] = None
    is_connected: bool
    last_synced_at: Optional[datetime] = None


class PlatformStatus(BaseModel):
    platform: str
    configurable: bool
    supports_oauth: bool = True
    connected_accounts: int = 0


class OAuthStartResponse(BaseModel):
    auth_url: str
    state: str


class SocialAccountDisconnect(BaseModel):
    message: str = "Disconnected"
