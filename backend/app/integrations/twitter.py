"""X (Twitter) API v2 integration using OAuth 2.0 PKCE.

X restricts third-party posting apps and requires OAuth 2.0 Authorization Code
with PKCE + user context. Requires an X developer app with read & write scopes.
"""

import base64
import hashlib
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

TWITTER_AUTH = "https://twitter.com/i/oauth2/authorize"
TWITTER_TOKEN = "https://api.twitter.com/2/oauth2/token"
TWITTER_API = "https://api.twitter.com/2"
SCOPES = "tweet.read tweet.write users.read offline.access"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


class TwitterProvider(SocialProvider):
    platform = "twitter"

    @property
    def configurable(self) -> bool:
        return bool(settings.X_CLIENT_ID and settings.X_CLIENT_SECRET)

    def _code_verifier(self, state: str) -> str:
        # Deterministic PKCE verifier derived from the random, signed OAuth state so the
        # authorize and token-exchange steps agree without storing anything server-side.
        digest = hashlib.sha256(f"{state}::{settings.SECRET_KEY}".encode()).digest()
        return _b64url(digest)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        verifier = self._code_verifier(state)
        challenge = _b64url(hashlib.sha256(verifier.encode()).digest())
        params = {
            "response_type": "code",
            "client_id": settings.X_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": SCOPES,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
        return f"{TWITTER_AUTH}?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    TWITTER_TOKEN,
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": redirect_uri,
                        "code_verifier": self._code_verifier(state),
                    },
                    auth=(settings.X_CLIENT_ID, settings.X_CLIENT_SECRET),
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"X token exchange failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return {"access_token": tokens.get("access_token"), "refresh_token": tokens.get("refresh_token"), "expires_in": tokens.get("expires_in"), "account": None}

    async def refresh_token(self, refresh_token: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    TWITTER_TOKEN,
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                    },
                    auth=(settings.X_CLIENT_ID, settings.X_CLIENT_SECRET),
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"X token refresh failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return tokens

    async def get_account(self, access_token: str, **kwargs) -> ProviderAccount:
        return await self.get_me(access_token)

    async def get_me(self, access_token: str) -> ProviderAccount:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{TWITTER_API}/users/me",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"user.fields": "profile_image_url,username,name"},
            )
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:300])
        data = resp.json()["data"]
        return ProviderAccount(
            provider_account_id=data["id"],
            display_name=data.get("name"),
            username=data.get("username"),
            avatar_url=data.get("profile_image_url"),
            page_type="profile",
        )

    async def publish_post(self, access_token: str, text: str, media_urls: Optional[list[str]] = None) -> PublishResult:
        if len(text) > 280:
            raise PlatformApiError("X posts are limited to 280 characters.")
        payload = {"text": text}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{TWITTER_API}/tweets",
                    headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                    json=payload,
                )
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        if resp.status_code == 429:
            raise RateLimitError()
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:300])
        tid = resp.json()["data"]["id"]
        return PublishResult(status="published", provider_post_id=tid, url=f"https://x.com/i/status/{tid}")
