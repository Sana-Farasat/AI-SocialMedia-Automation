"""Meta Graph API integration for Facebook Pages and Instagram.

Facebook Pages publishing works via the Graph API with a Page access token.
Instagram publishing requires additional App Review approval from Meta.
When that approval is absent, we surface a clear "Not configured / requires approval"
message rather than faking it.
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
    TokenInvalidError,
)

GRAPH = "https://graph.facebook.com/v20.0"


def _oauth_error(resp: httpx.Response, exc: Optional[Exception] = None) -> PlatformApiError:
    try:
        err = resp.json().get("error", {})
        code = str(err.get("code") or "PLATFORM_API")
        message = err.get("message") or resp.text[:300]
    except Exception:  # noqa: BLE001
        code = "PLATFORM_API"
        message = resp.text[:300]
    if code in ("190", "OAuthException") or "expired" in message.lower():
        return TokenExpiredError(message)
    if code == "4" or "rate" in message.lower():
        return RateLimitError(message)
    if code in ("190", "OAuthException"):
        return TokenInvalidError(message)
    return PlatformApiError(message, code=code)


class FacebookProvider(SocialProvider):
    platform = "facebook"

    @property
    def configurable(self) -> bool:
        return bool(settings.META_CLIENT_ID and settings.META_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "client_id": settings.META_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "pages_show_list,pages_manage_posts,pages_read_engagement,public_profile",
            "response_type": "code",
        }
        return f"{GRAPH}/dialog/oauth?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{GRAPH}/oauth/access_token",
                    params={
                        "client_id": settings.META_CLIENT_ID,
                        "client_secret": settings.META_CLIENT_SECRET,
                        "redirect_uri": redirect_uri,
                        "code": code,
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise _oauth_error(exc.response) from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        return {"access_token": tokens.get("access_token"), "expires_in": tokens.get("expires_in"), "account": None}

    async def get_pages(self, access_token: str) -> list[ProviderAccount]:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{GRAPH}/me/accounts",
                    params={"access_token": access_token, "fields": "id,name,link,picture.type(large)"},
                )
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise _oauth_error(resp)
        data = resp.json().get("data", [])
        return [
            ProviderAccount(
                provider_account_id=p["id"],
                display_name=p.get("name"),
                page_type="page",
                avatar_url=(p.get("picture") or {}).get("data", {}).get("url"),
                raw=p,
            )
            for p in data
        ]

    async def get_account(self, access_token: str, **kwargs) -> ProviderAccount:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{GRAPH}/me",
                    params={"access_token": access_token, "fields": "id,name,picture.type(large)"},
                )
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise _oauth_error(resp)
        data = resp.json()
        return ProviderAccount(
            provider_account_id=data["id"],
            display_name=data.get("name"),
            page_type="profile",
            avatar_url=(data.get("picture") or {}).get("data", {}).get("url"),
            raw=data,
        )

    async def publish_post(
        self, access_token: str, text: str, media_urls: Optional[list[str]] = None
    ) -> PublishResult:
        if not text:
            raise PlatformApiError("Facebook requires text (either in a photo or a status).")
        body: dict = {"message": text, "access_token": access_token}
        try:
            async with httpx.AsyncClient() as client:
                if media_urls:
                    first = media_urls[0]
                    if len(media_urls) == 1:
                        resp = await client.post(f"{GRAPH}/me/photos", data={"url": first, **body})
                    else:
                        body["attached_media"] = [
                            {"media_fbid": url} for url in media_urls
                        ]
                        resp = await client.post(f"{GRAPH}/me/feed", data=body)
                else:
                    resp = await client.post(f"{GRAPH}/me/feed", data=body)
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        if resp.status_code == 401:
            raise TokenExpiredError()
        if resp.status_code >= 400:
            raise _oauth_error(resp)
        post_id = resp.json().get("id")
        return PublishResult(status="published", provider_post_id=post_id, url=f"https://www.facebook.com/{post_id}")


class InstagramProvider(SocialProvider):
    """Instagram content publishing via the Meta Graph API.

    NOTE: Publishing as a Business/Creator account requires Meta App Review &
    the `instagram_basic`, `instagram_content_publish`, and `business_management`
    permissions. Until granted, set META_CLIENT_ID/SECRET and the UI will show an
    approval-required state.
    """

    platform = "instagram"

    @property
    def configurable(self) -> bool:
        return bool(settings.META_CLIENT_ID and settings.META_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "client_id": settings.META_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "instagram_basic,instagram_content_publish,business_management,pages_show_list",
            "response_type": "code",
        }
        return f"{GRAPH}/dialog/oauth?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        # Same OAuth token endpoint as Facebook (Meta).
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{GRAPH}/oauth/access_token",
                    params={
                        "client_id": settings.META_CLIENT_ID,
                        "client_secret": settings.META_CLIENT_SECRET,
                        "redirect_uri": redirect_uri,
                        "code": code,
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
        except httpx.HTTPStatusError as exc:
            raise _oauth_error(exc.response) from exc
        except httpx.TransportError as exc:
            raise NetworkError(str(exc)) from exc
        access_token = tokens.get("access_token")
        instagram = await self._resolve_instagram_account(access_token)
        return {
            "access_token": access_token,
            "expires_in": tokens.get("expires_in"),
            "account": instagram,
        }

    async def _resolve_instagram_account(self, access_token: str) -> ProviderAccount:
        # Find the connected IG business account through a linked Facebook page.
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH}/me/accounts",
                params={"access_token": access_token, "fields": "instagram_business_account{id,username,profile_picture_url}"},
            )
        if resp.status_code >= 400:
            raise _oauth_error(resp)
        for page in resp.json().get("data", []):
            ib = page.get("instagram_business_account")
            if ib:
                return ProviderAccount(
                    provider_account_id=ib["id"],
                    username=ib.get("username"),
                    display_name=ib.get("username"),
                    avatar_url=ib.get("profile_picture_url"),
                    page_type="business",
                )
        raise PlatformApiError(
            "No Instagram Business/Creator account linked. Instagram publishing requires Meta App Review approval.",
            code="APPROVAL_REQUIRED",
        )

    async def publish_post(self, access_token: str, text: str, media_urls: Optional[list[str]] = None) -> PublishResult:
        account = await self.get_account(access_token)
        ig_user_id = account.provider_account_id
        if not media_urls:
            raise PlatformApiError("Instagram posts require at least one image or video.")
        # Container creation (image/video/reel).
        if len(media_urls) == 1:
            container = await self._create_container(access_token, ig_user_id, media_urls[0], text)
        else:
            container = await self._create_carousel(access_token, ig_user_id, media_urls, text)
        # Publish the container.
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GRAPH}/{ig_user_id}/media_publish",
                params={
                    "creation_id": container,
                    "caption": text,
                    "access_token": access_token,
                },
            )
        if resp.status_code >= 400:
            raise _oauth_error(resp)
        return PublishResult(status="processing", provider_post_id=resp.json().get("id"))

    async def _create_container(self, access_token: str, ig_user_id: str, media_url: str, caption: str) -> str:
        is_video = media_url.lower().endswith((".mp4", ".mov"))
        params: dict = {
            "image_url" if not is_video else "video_url": media_url,
            "caption": caption,
            "access_token": access_token,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{GRAPH}/{ig_user_id}/media", params=params)
        if resp.status_code >= 400:
            raise _oauth_error(resp)
        return resp.json()["id"]

    async def _create_carousel(self, access_token: str, ig_user_id: str, media_urls: list[str], caption: str) -> str:
        children = []
        for url in media_urls:
            is_video = url.lower().endswith((".mp4", ".mov"))
            params = {
                "image_url" if not is_video else "video_url": url,
                "is_carousel_item": "true",
                "access_token": access_token,
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(f"{GRAPH}/{ig_user_id}/media", params=params)
            if resp.status_code >= 400:
                raise _oauth_error(resp)
            children.append(resp.json()["id"])
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GRAPH}/{ig_user_id}/media",
                params={
                    "media_type": "CAROUSEL",
                    "children": ",".join(children),
                    "caption": caption,
                    "access_token": access_token,
                },
            )
        if resp.status_code >= 400:
            raise _oauth_error(resp)
        return resp.json()["id"]

    async def get_account(self, access_token: str, **kwargs) -> ProviderAccount:
        return await self._resolve_instagram_account(access_token)
