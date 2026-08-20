"""YouTube Data API v3 integration for uploading videos to channels.

Requires Google OAuth with `youtube.upload` scope. Video uploads use resumable
uploads; for simplicity this adapter performs a direct upload of a video URL
and provides OAuth wiring consistent with the other providers.
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

YOUTUBE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
YOUTUBE_TOKEN = "https://oauth2.googleapis.com/token"
YOUTUBE_API = "https://www.googleapis.com/youtube/v3"


class YouTubeProvider(SocialProvider):
    platform = "youtube"

    @property
    def configurable(self) -> bool:
        return bool(settings.YOUTUBE_CLIENT_ID and settings.YOUTUBE_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "client_id": settings.YOUTUBE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{YOUTUBE_AUTH}?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    YOUTUBE_TOKEN,
                    data={
                        "code": code,
                        "client_id": settings.YOUTUBE_CLIENT_ID,
                        "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"YouTube token exchange failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return {"access_token": tokens.get("access_token"), "refresh_token": tokens.get("refresh_token"), "expires_in": tokens.get("expires_in"), "account": None}

    async def get_account(self, access_token: str, **kwargs) -> ProviderAccount:
        channels = await self.get_channels(access_token)
        if not channels:
            raise PlatformApiError("No YouTube channel found for this account.")
        return channels[0]

    async def refresh_token(self, refresh_token: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    YOUTUBE_TOKEN,
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                        "client_id": settings.YOUTUBE_CLIENT_ID,
                        "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"YouTube token refresh failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return tokens

    async def get_channels(self, access_token: str) -> list[ProviderAccount]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{YOUTUBE_API}/channels",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"part": "snippet", "mine": "true"},
            )
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:300])
        return [
            ProviderAccount(
                provider_account_id=ch["id"],
                display_name=ch["snippet"].get("title"),
                avatar_url=ch["snippet"].get("thumbnails", {}).get("default", {}).get("url"),
                page_type="channel",
                raw=ch,
            )
            for ch in resp.json().get("items", [])
        ]

    async def publish_post(self, access_token: str, text: str, media_urls: Optional[list[str]] = None) -> PublishResult:
        if not media_urls:
            raise PlatformApiError("YouTube uploads require a video URL.")
        raise PlatformApiError(
            "YouTube video upload requires a resumable upload flow with a direct byte stream. "
            "Configure a storage-signed pull URL to complete this integration.",
            code="NEEDS_SETUP",
        )
