"""Threads API v1 integration (Meta).

Threads publishing uses the Threads API which requires Meta App Review for the
`threads_read_replies`, `threads_write` permissions. Structurally wired to the
common provider interface; shows approval-required until enabled.
"""

from typing import Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.integrations.base import ProviderAccount, PublishResult, SocialProvider
from app.integrations.errors import (
    NetworkError,
    PlatformApiError,
    RateLimitError,
    TokenExpiredError,
)

THREADS_API = "https://graph.threads.net/v1.0"


class ThreadsProvider(SocialProvider):
    platform = "threads"

    @property
    def configurable(self) -> bool:
        return bool(settings.META_CLIENT_ID and settings.META_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "client_id": settings.META_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "threads_basic,threads_content_publish",
            "response_type": "code",
        }
        return f"https://www.threads.net/oauth/authorize?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://graph.threads.net/oauth/access_token",
                    data={
                        "client_id": settings.META_CLIENT_ID,
                        "client_secret": settings.META_CLIENT_SECRET,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                        "code": code,
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"Threads token exchange failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return {"access_token": tokens.get("access_token"), "user_id": tokens.get("user_id"), "expires_in": tokens.get("expires_in"), "account": None}

    async def refresh_token(self, refresh_token: str) -> dict:
        # Threads long-lived tokens are refreshed from the current access token.
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{THREADS_API}/refresh_access_token",
                    params={"grant_type": "th_refresh_token", "access_token": refresh_token},
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"Threads token refresh failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return tokens

    async def get_account(self, access_token: str, user_id: str) -> ProviderAccount:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{THREADS_API}/{user_id}",
                params={"fields": "id,username,threads_profile_picture_url,name", "access_token": access_token},
            )
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:300])
        data = resp.json()
        return ProviderAccount(
            provider_account_id=data["id"],
            display_name=data.get("name"),
            username=data.get("username"),
            avatar_url=data.get("threads_profile_picture_url"),
            page_type="profile",
        )

    async def publish_post(self, access_token: str, text: str, media_urls: Optional[list[str]] = None) -> PublishResult:
        raise PlatformApiError(
            "Threads publishing (threads_write) requires Meta App Review approval. Configure it once granted.",
            code="APPROVAL_REQUIRED",
        )
