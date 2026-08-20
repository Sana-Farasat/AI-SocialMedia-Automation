from typing import Optional

from pydantic import BaseModel

from app.core.config import settings
from app.models import AIRequest, User
from app.services.ai.registry import registry
from sqlmodel.ext.asyncio.session import AsyncSession


class GenerateRequest(BaseModel):
    prompt: str
    platform: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    model: Optional[str] = None


class RewriteRequest(BaseModel):
    text: str
    style: str = "professional"  # professional|casual|shorter|longer
    platform: Optional[str] = None
    add_cta: bool = False
    add_hashtags: bool = False


class GenerateResponse(BaseModel):
    content: str
    platform: Optional[str] = None
    provider: str
    model: Optional[str] = None


def _platform_guidance(platform: Optional[str]) -> str:
    guide = {
        "instagram": "Write an engaging caption with relevant hashtags and a clear CTA. Use emojis sparingly.",
        "linkedin": "Write a professional post with a strong hook, insight, and a CTA. No hashtags spam.",
        "twitter": "Write a concise, punchy post under 280 characters. Keep it sharp and direct.",
        "facebook": "Write an engaging, conversational description that encourages discussion.",
        "pinterest": "Provide a short SEO-friendly title and a helpful description.",
        "youtube": "Write a title and a compelling description with timestamps/hashtags.",
        "tiktok": "Write a short, catchy caption with trending hashtags.",
        "threads": "Write a short, conversational post with a CTA.",
    }
    if platform:
        return guide.get(platform.lower(), "")
    return "Write platform-neutral, engaging social content."


class AIService:
    def __init__(self) -> None:
        self.registry = registry

    def get_client(self, user: User):
        return self.registry.get_client(user.ai_provider if hasattr(user, "ai_provider") else settings.DEFAULT_AI_PROVIDER)

    async def generate(self, session: AsyncSession, user: User, req: GenerateRequest) -> GenerateResponse:
        client = self.get_client(user)
        tone = req.tone or getattr(user, "default_tone", None) or "professional"
        language = req.language or getattr(user, "default_language", None) or "en"
        system = (
            f"You are an expert social media content strategist. Write in {language} "
            f"with a {tone} tone. {_platform_guidance(req.platform)} "
            "Return only the content, no extra commentary."
        )
        try:
            content = await client.generate_text(system, req.prompt, model=req.model)
            status = "completed"
            error = None
        except Exception as exc:  # noqa: BLE001
            content = ""
            status = "failed"
            error = str(exc)
            raise

        record = AIRequest(
            user_id=user.id,
            provider=client.name(),
            model=req.model or settings.DEFAULT_AI_MODEL,
            action="generate",
            input_prompt=req.prompt,
            output_text=content or None,
            status=status,
            error_message=error,
        )
        session.add(record)
        await session.commit()
        return GenerateResponse(content=content, platform=req.platform, provider=client.name(), model=req.model)

    async def rewrite(self, session: AsyncSession, user: User, req: RewriteRequest) -> GenerateResponse:
        client = self.get_client(user)
        style_instruction = {
            "professional": "Rewrite to sound professional and polished.",
            "casual": "Rewrite to sound casual and friendly.",
            "shorter": "Shorten this to a concise version.",
            "longer": "Expand this into a fuller post.",
        }.get(req.style or "professional", "Keep the meaning the same but improve the writing.")
        extras = ""
        if req.add_cta:
            extras += " Add a clear call to action."
        if req.add_hashtags:
            extras += " Add 5 relevant hashtags at the end."
        system = (
            f"You are a social media copy editor. Currently you are applying style: {style_instruction}"
            f"{extras} {_platform_guidance(req.platform)} Return only the rewritten content."
        )
        content = await client.generate_text(system, req.text, model=None)
        record = AIRequest(
            user_id=user.id,
            provider=client.name(),
            action="rewrite",
            input_prompt=req.text,
            output_text=content,
            status="completed",
        )
        session.add(record)
        await session.commit()
        return GenerateResponse(content=content, platform=req.platform, provider=client.name())

    async def ideas(self, session: AsyncSession, user: User, req: GenerateRequest) -> GenerateResponse:
        client = self.get_client(user)
        system = "You are a creative content strategist. Provide 5 distinct content ideas, each on its own line."
        content = await client.generate_text(system, req.prompt)
        session.add(
            AIRequest(user_id=user.id, provider=client.name(), action="ideas", input_prompt=req.prompt, output_text=content)
        )
        await session.commit()
        return GenerateResponse(content=content, provider=client.name())

    async def hashtags(self, session: AsyncSession, user: User, req: GenerateRequest) -> GenerateResponse:
        client = self.get_client(user)
        system = "Generate 15 relevant hashtags, space-separated. Return only the hashtags."
        content = await client.generate_text(system, req.prompt)
        session.add(
            AIRequest(user_id=user.id, provider=client.name(), action="hashtags", input_prompt=req.prompt, output_text=content)
        )
        await session.commit()
        return GenerateResponse(content=content, provider=client.name())


ai_service = AIService()
