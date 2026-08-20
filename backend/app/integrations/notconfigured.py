from app.integrations.base import ProviderAccount, SocialProvider
from app.integrations.errors import PlatformApiError


class NotConfiguredProvider(SocialProvider):
    """Represents a platform whose developer credentials/approval are not set up.

    This gives a graceful "Not configured" state in the dashboard instead of
    pretending the integration works. Once credentials are provided via env vars,
    the real adapter replaces this one.
    """

    platform = "unknown"

    @property
    def configurable(self) -> bool:
        return False

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        raise PlatformApiError(f"{self.platform} integration is not configured. Add its credentials to enable it.")

    async def exchange_code(self, code: str, redirect_uri: str, state: str) -> dict:
        raise PlatformApiError(f"{self.platform} integration is not configured.")

    async def get_account(self, access_token: str) -> ProviderAccount:
        raise PlatformApiError(f"{self.platform} integration is not configured.")

    async def publish_post(self, access_token: str, text: str, media_urls=None) -> None:
        raise PlatformApiError(f"{self.platform} integration is not configured.")
