from typing import Optional

from app.core.config import settings
from app.integrations.base import SocialProvider


class ProviderRegistry:
    """Maps a platform key to its SocialProvider implementation."""

    def __init__(self) -> None:
        self._providers: dict[str, type[SocialProvider]] = {}

    def register(self, provider_cls: type[SocialProvider]) -> None:
        self._providers[provider_cls.platform] = provider_cls

    def get(self, platform: str) -> SocialProvider:
        if platform not in self._providers:
            raise KeyError(f"No provider registered for platform: {platform}")
        return self._providers[platform]()

    def has(self, platform: str) -> bool:
        return platform in self._providers

    def available(self) -> list[str]:
        return list(self._providers.keys())


registry = ProviderRegistry()
