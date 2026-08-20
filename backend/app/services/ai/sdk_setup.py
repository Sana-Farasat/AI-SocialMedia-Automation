"""Configures the OpenAI Agents SDK to talk to Gemini's OpenAI-compatible endpoint.

Google exposes `https://generativelanguage.googleapis.com/v1beta/openai/` which is
compatible enough for the OpenAI Agents SDK. We build an AsyncOpenAI client pointed
at that endpoint using the free GEMINI_API_KEY, and tell the SDK to use it.
"""

from typing import Optional

from openai import AsyncOpenAI

from app.core.config import settings

# Gemini OpenAI-compatible base URL
GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_DEFAULT_MODEL = "gemini-2.0-flash"


def gemini_async_client(api_key: Optional[str] = None) -> AsyncOpenAI:
    key = api_key or settings.GEMINI_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return AsyncOpenAI(
        api_key=key,
        base_url=GEMINI_OPENAI_BASE_URL,
    )
