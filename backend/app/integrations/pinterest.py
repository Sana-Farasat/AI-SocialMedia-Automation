"""Pinterest API v5 integration (OAuth 2.0). Requires a Pinterest developer app."""

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

PINTEREST_AUTH = "https://www.pinterest.com/oauth/"
PINTEREST_TOKEN = "https://api.pinterest.com/v5/oauth/token"
PINTEREST_API = "https://api.pinterest.com/v5"


class PinterestProvider(SocialProvider):
    platform = "pinterest"

    @property
    def configurable(self) -> bool:
        return bool(settings.PINTEREST_CLIENT_ID and settings.PINTEREST_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "client_id": settings.PINTEREST_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "boards:read,boards:write,pins:read,pins:write,user_accounts:read",
            "state": state,
        }
        return f"{PINTEREST_AUTH}?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    PINTEREST_TOKEN,
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": redirect_uri,
                    },
                    auth=(settings.PINTEREST_CLIENT_ID, settings.PINTEREST_CLIENT_SECRET),
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"Pinterest token exchange failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return {"access_token": tokens.get("access_token"), "refresh_token": tokens.get("refresh_token"), "expires_in": tokens.get("expires_in"), "account": None}

    async def get_account(self, access_token: str, **kwargs) -> ProviderAccount:
        return await self.get_me(access_token)

    async def get_me(self, access_token: str) -> ProviderAccount:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{PINTEREST_API}/user_account",
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:300])
        data = resp.json()
        return ProviderAccount(
            provider_account_id=data["username"],
            display_name=data.get("username"),
            username=data.get("username"),
            page_type="profile",
        )

    async def _first_board(self, access_token: str) -> str:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{PINTEREST_API}/boards",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:300])
        items = resp.json().get("items", [])
        if not items:
            raise PlatformApiError("No Pinterest board available. Create a board in your account first.")
        return items[0]["id"]

    async def publish_post(self, access_token: str, text: str, media_urls: Optional[list[str]] = None) -> PublishResult:
        # Pins require a media url + board. Pinterest has no text-only post.
        if not media_urls:
            raise PlatformApiError("Pinterest pins require at least one image URL.")
        board_id = await self._first_board(access_token)
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{PINTEREST_API}/pins",
                    headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                    json={
                        "board_id": board_id,
                        "media_source": {"source_type": "image_url", "url": media_urls[0]},
                        "title": text,
                        "description": text,
                    },
                )
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        if resp.status_code == 429:
            raise RateLimitError()
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:300])
        return PublishResult(status="published", provider_post_id=resp.json().get("id"))
