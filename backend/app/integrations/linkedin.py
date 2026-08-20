from typing import Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.integrations.base import (
    ProviderAccount,
    PublishResult,
    SocialProvider,
)
from app.integrations.errors import (
    NetworkError,
    PlatformApiError,
    RateLimitError,
    TokenExpiredError,
    TokenInvalidError,
)

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_API = "https://api.linkedin.com/v2"
SCOPES = "r_liteprofile r_emailaddress w_member_social"


class LinkedInProvider(SocialProvider):
    platform = "linkedin"

    @property
    def configurable(self) -> bool:
        return bool(settings.LINKEDIN_CLIENT_ID and settings.LINKEDIN_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": SCOPES,
            "state": state,
        }
        return f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    LINKEDIN_TOKEN_URL,
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": redirect_uri,
                        "client_id": settings.LINKEDIN_CLIENT_ID,
                        "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"LinkedIn token exchange failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc

        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        meta = await self._get_auth_meta(access_token) if access_token else {}
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": tokens.get("expires_in"),
            "account": self._account_from_meta(meta),
        }

    async def _get_auth_meta(self, access_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{LINKEDIN_API}/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code == 401:
                raise TokenExpiredError()
            resp.raise_for_status()
            return resp.json()

    def _account_from_meta(self, meta: dict) -> ProviderAccount:
        return ProviderAccount(
            provider_account_id=str(meta.get("sub", "")),
            display_name=meta.get("name"),
            username=meta.get("email"),
            avatar_url=meta.get("picture", ""),
            page_type="profile",
        )

    async def get_account(self, access_token: str, **kwargs) -> ProviderAccount:
        meta = await self._get_auth_meta(access_token)
        return self._account_from_meta(meta)

    async def refresh_token(self, refresh_token: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    LINKEDIN_TOKEN_URL,
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                        "client_id": settings.LINKEDIN_CLIENT_ID,
                        "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise PlatformApiError(f"LinkedIn token refresh failed: {exc.response.text}") from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return tokens

    async def publish_post(
        self, access_token: str, text: str, media_urls: Optional[list[str]] = None
    ) -> PublishResult:
        if not text:
            raise PlatformApiError("LinkedIn requires text content")
        await self.get_account(access_token)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-RestLi-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202409",
        }
        body = {
            "author": "urn:li:person:ME",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(f"{LINKEDIN_API}/ugcPosts", headers=headers, json=body)
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        self._raise_for_error(resp)
        post_id = resp.headers.get("x-restli-id")
        return PublishResult(status="published", provider_post_id=post_id, url=post_id and f"https://www.linkedin.com/feed/update/{post_id}")

    def _raise_for_error(self, resp: httpx.Response) -> None:
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code == 429:
            raise RateLimitError()
        if resp.status_code == 403:
            raise TokenInvalidError()
        if resp.status_code >= 400:
            raise PlatformApiError(resp.text[:500])
