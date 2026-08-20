import json
from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "SocialPilot AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api"
    # SECRET_KEY used to sign access tokens and cookies. Set a strong value in production.
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    PASSWORD_RESET_TOKEN_MINUTES: int = 30

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/socialpilot_ai"

    # CORS
    FRONTEND_URLS: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    BACKEND_URL: str = "http://localhost:8000"

    @field_validator("FRONTEND_URLS", mode="before")
    @classmethod
    def _parse_frontend_urls(cls, v):
        """Accept JSON arrays (Vercel-style) or comma-separated lists."""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                try:
                    return json.loads(v)
                except ValueError:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    # AI providers (OpenAI Agents SDK talking to Gemini's OpenAI-compatible endpoint)
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    DEFAULT_AI_PROVIDER: str = "gemini"
    DEFAULT_AI_MODEL: str = "gemini-2.0-flash"

    # Redis / worker
    REDIS_URL: str = "redis://localhost:6379/0"
    # Dedicated token for the external cron trigger endpoint (/api/worker/process-due).
    # Avoids putting SECRET_KEY in URLs (e.g. cron-job.org). Falls back to SECRET_KEY when unset.
    WORKER_TOKEN: str = ""

    # OAuth provider credentials (empty => platform shows "Not configured")
    META_CLIENT_ID: str = ""
    META_CLIENT_SECRET: str = ""
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    X_CLIENT_ID: str = ""
    X_CLIENT_SECRET: str = ""
    PINTEREST_CLIENT_ID: str = ""
    PINTEREST_CLIENT_SECRET: str = ""
    TIKTOK_CLIENT_KEY: str = ""
    TIKTOK_CLIENT_SECRET: str = ""
    YOUTUBE_CLIENT_ID: str = ""
    YOUTUBE_CLIENT_SECRET: str = ""

    # Object storage (Cloudinary / S3-compatible / Supabase)
    STORAGE_PROVIDER: str = "local"  # local | cloudinary | s3 | supabase
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    S3_BUCKET: str = ""
    S3_REGION: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT_URL: str = ""
    SUPABASE_STORAGE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = ""

    # Email verification / password reset (architecture; provider pluggable)
    EMAIL_VERIFICATION_REQUIRED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@example.com"

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 120


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
