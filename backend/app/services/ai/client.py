from typing import Optional

from agents import Agent, Runner
from agents.models.openai_provider import OpenAIProvider

from app.services.ai.base import AIClient


class OpenAIAgentsClient(AIClient):
    """LLM client built on the OpenAI Agents SDK, targeting Gemini's OpenAI-compatible endpoint."""

    def __init__(self, provider: OpenAIProvider, model: str) -> None:
        self._provider = provider
        self._model = model

    def name(self) -> str:
        return "openai-agents"

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        model: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        agent = Agent(
            name="SocialContentAssistant",
            instructions=system_prompt,
            model=model or self._model,
        )
        result = await Runner.run(
            agent,
            input=user_prompt,
            run_config={"model_provider": self._provider},
        )
        return str(result.final_output).strip()
