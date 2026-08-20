from abc import ABC, abstractmethod
from typing import Any, Optional


class AIClient(ABC):
    """Abstraction over the LLM provider. Implemented with the OpenAI Agents SDK."""

    @abstractmethod
    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        model: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        """Return generated text for the given prompts."""
        raise NotImplementedError

    def name(self) -> str:
        raise NotImplementedError
