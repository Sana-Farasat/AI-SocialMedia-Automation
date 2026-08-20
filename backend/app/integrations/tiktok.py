"""TikTok Content Posting API integration.

Requires a TikTok developer app with the `video.publish` scope (subject to
TikTok's approval). Structurally wired to follow the common provider interface;
until credentials are set the dashboard shows "Not configured".
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

TIKTOK_AUTH = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_API = "https://open.tiktokapis.com/v2"


class TikTokProvider(SocialProvider):
    platform = "tiktok"
    QUERY_SCOPES = "user.info.basic,video.publish"

    @property
    def configurable(self) -> bool:
        return bool(settings.TIKTOK_CLIENT_KEY and settings.TIKTOK_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "client_key": settings.TIKTOK_CLIENT_KEY,
            "response_type": "code",
            "scope": self.QUERY_SCOPES,
            "redirect_uri": redirect_uri,
            "state": state,
        }
        return f"{TIKTOK_AUTH}?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    TIKTOK_TOKEN,
                    data={
                        "client_key": settings.TIKTOK_CLIENT_KEY,
                        "client_secret": settings.TIKTOK_CLIENT_SECRET,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"TikTok token exchange failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return {
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_in": tokens.get("expires_in"),
            "account": None,
        }

    async def get_account(self, access_token: str, **kwargs) -> ProviderAccount:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{TIKTOK_API}/user/info/",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "open_id,display_name,avatar_url"},
            )
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:300])
        user = resp.json()["data"]["user"]
        return ProviderAccount(
            provider_account_id=user["open_id"],
            display_name=user.get("display_name"),
            avatar_url=user.get("avatar_url"),
            page_type="profile",
        )

    async def refresh_token(self, refresh_token: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    TIKTOK_TOKEN,
                    data={
                        "client_key": settings.TIKTOK_CLIENT_KEY,
                        "client_secret": settings.TIKTOK_CLIENT_SECRET,
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"TikTok token refresh failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return tokens

    async def publish_post(self, access_token: str, text: str, media_urls: Optional[list[str]] = None) -> PublishResult:
        if not media_urls:
            raise PlatformApiError("TikTok posts require a video URL.")
        # Step 1: initialize the video upload.
        async with httpx.AsyncClient() as client:
            init = await client.post(
                f"{TIKTOK_API}/post/publish/video/init/",
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json={
                    "post_info": {"title": text, "privacy_level": "SELF_ONLY", "disable_duet": False},
                    "source_info": {"source": "PULL_FROM_URL", "video_url": media_urls[0]},
                },
            )
        if init.status_code == 401:
            raise TokenExpiredError()
        if init.status_code == 429:
            raise RateLimitError()
        if init.status_code >= 400:
            raise PlatformApiError(init.text[:300])
        data = init.json()["data"]
        return PublishResult(status="processing", provider_post_id=data.get("publish_id"))
