"""Social platform integration adapters.

Registers every platform adapter with the global ProviderRegistry.
Adapters that require API approval expose a graceful "Not configured" state.
"""

from app.integrations.base import (
    ProviderAccount,
    PublishResult,
    SocialProvider,
)
from app.integrations.registry import registry

# Import adapter modules so they self-register (import side-effect is explicit below).
from app.integrations.linkedin import LinkedInProvider
from app.integrations.meta import FacebookProvider, InstagramProvider
from app.integrations.twitter import TwitterProvider
from app.integrations.pinterest import PinterestProvider
from app.integrations.tiktok import TikTokProvider
from app.integrations.youtube import YouTubeProvider
from app.integrations.threads import ThreadsProvider

registry.register(LinkedInProvider)
registry.register(FacebookProvider)
registry.register(InstagramProvider)
registry.register(TwitterProvider)
registry.register(PinterestProvider)
registry.register(TikTokProvider)
registry.register(YouTubeProvider)
registry.register(ThreadsProvider)

__all__ = [
    "SocialProvider",
    "ProviderAccount",
    "PublishResult",
    "registry",
]
