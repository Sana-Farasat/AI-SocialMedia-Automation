from datetime import datetime
from typing import Optional

from sqlmodel import Field

from app.models.base import BaseModel, utcnow


class User(BaseModel, table=True):
    __tablename__ = "users"

    email: str = Field(unique=True, index=True, nullable=False)
    full_name: Optional[str] = Field(default=None, max_length=255)
    hashed_password: str = Field(nullable=False)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    is_superuser: bool = Field(default=False)
    last_login_at: Optional[datetime] = Field(default=None)

    # Settings
    default_timezone: str = Field(default="UTC")
    default_language: str = Field(default="en")
    default_tone: str = Field(default="professional")
    ai_provider: str = Field(default="openai")
    ai_model: Optional[str] = Field(default=None, max_length=100)
