from agents.models.openai_provider import OpenAIProvider

from app.core.config import settings
from app.core.config import Settings
from app.services.ai.base import AIClient
from app.services.ai.client import OpenAIAgentsClient
from app.services.ai.sdk_setup import GEMINI_OPENAI_BASE_URL, gemini_async_client


class AIProviderRegistry:
    """Returns a configured AIClient. Backed by the OpenAI Agents SDK + Gemini endpoint."""

    def __init__(self, app_settings: Settings | None = None) -> None:
        self._settings = app_settings or settings
        self._openai_client = None
        self._gemini_provider = None

    def _get_gemini_provider(self):
        if self._gemini_provider is None:
            client = gemini_async_client() if not self._openai_client else self._openai_client
            self._openai_client = client
            self._gemini_provider = OpenAIProvider(
                openai_client=client,
                use_responses=False,  # chat.completions -> best Gemini compatibility
            )
        return self._gemini_provider

    def get_client(self, provider: str | None = None, model: str | None = None) -> AIClient:
        # Regardless of requested provider name, model is served by Gemini endpoint
        # through the OpenAI-compatible interface.
        actual_model = model or self._settings.DEFAULT_AI_MODEL or "gemini-2.0-flash"
        return OpenAIAgentsClient(provider=self._get_gemini_provider(), model=actual_model)


registry = AIProviderRegistry()
