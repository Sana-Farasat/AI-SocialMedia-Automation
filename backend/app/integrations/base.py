from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProviderAccount(BaseModel):
    """A normalized account/page returned by a social provider."""

    provider_account_id: str
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    page_type: Optional[str] = None
    raw: Optional[dict] = None


class PublishResult(BaseModel):
    status: str  # published | processing
    provider_post_id: Optional[str] = None
    url: Optional[str] = None
    raw: Optional[dict] = None


class SocialProvider(ABC):
    """Common interface implemented by every social platform adapter.

    Only implement methods actually supported by the platform's official API.
    Unsupported methods raise NotImplementedError (and the UI shows "Not available").
    """

    platform: str
    configurable: bool = False  # True when OAuth credentials are set up

    # --- OAuth ---
    @abstractmethod
    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        raise NotImplementedError

    @abstractmethod
    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        """Exchange an OAuth code for tokens, validate state, return {tokens, account}."""
        raise NotImplementedError

    async def refresh_token(self, refresh_token: str) -> dict:
        raise NotImplementedError

    # --- Account ---
    async def get_account(self, access_token: str, **kwargs) -> ProviderAccount:
        raise NotImplementedError

    # --- Content ---
    async def publish_post(self, access_token: str, text: str, media_urls: Optional[list[str]] = None) -> PublishResult:
        raise NotImplementedError

    async def get_publish_status(self, access_token: str, provider_post_id: str) -> str:
        raise NotImplementedError

    # --- Analytics (only if supported) ---
    async def get_metrics(
        self, access_token: str, provider_account_id: str, since: datetime, until: datetime
    ) -> dict:
        raise NotImplementedError

    def capabilities(self) -> list[str]:
        return ["oauth accounts content"]
