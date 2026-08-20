from datetime import datetime
from typing import Optional

from sqlmodel import Field

from app.models.base import BaseModel, utcnow


class Post(BaseModel, table=True):
    """User-authored content (a draft or published article)."""

    __tablename__ = "posts"

    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    text: Optional[str] = Field(default=None)
    status: str = Field(default="draft", index=True)  # draft|scheduled|processing|published|failed|cancelled
    is_ai_generated: bool = Field(default=False)
    ai_request_id: Optional[str] = Field(default=None)


class PostPlatform(BaseModel, table=True):
    """Links a Post to the platforms it should be published to, with per-platform state."""

    __tablename__ = "post_platforms"

    post_id: str = Field(foreign_key="posts.id", index=True, nullable=False)
    platform: str = Field(index=True, nullable=False)
    social_account_id: Optional[str] = Field(foreign_key="social_accounts.id", index=True, default=None)
    status: str = Field(default="pending", index=True)  # pending|scheduled|processing|published|failed|cancelled
    platform_post_id: Optional[str] = Field(default=None)  # id returned by the platform
    platform_url: Optional[str] = Field(default=None)
    error_message: Optional[str] = Field(default=None)


class Media(BaseModel, table=True):
    """Media associated with a post."""

    __tablename__ = "media"

    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    post_id: Optional[str] = Field(foreign_key="posts.id", index=True, default=None)
    file_type: str = Field(nullable=False)  # image|video
    mime_type: Optional[str] = Field(default=None)
    storage_key: Optional[str] = Field(default=None)  # path/key in object storage
    public_url: Optional[str] = Field(default=None)
    size_bytes: Optional[int] = Field(default=None)
    width: Optional[int] = Field(default=None)
    height: Optional[int] = Field(default=None)


class Schedule(BaseModel, table=True):
    """When a post should be published."""

    __tablename__ = "schedules"

    post_id: str = Field(foreign_key="posts.id", index=True, nullable=False)
    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    scheduled_at: datetime = Field(index=True, nullable=False)
    timezone: str = Field(default="UTC")
    status: str = Field(default="scheduled", index=True)  # draft|scheduled|processing|published|failed|cancelled
    fired_at: Optional[datetime] = Field(default=None)


class PublishAttempt(BaseModel, table=True):
    """A single attempt to publish a post to a platform."""

    __tablename__ = "publish_attempts"

    post_id: str = Field(foreign_key="posts.id", index=True, nullable=False)
    post_platform_id: Optional[str] = Field(foreign_key="post_platforms.id", index=True, default=None)
    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    platform: str = Field(index=True, nullable=False)
    social_account_id: Optional[str] = Field(foreign_key="social_accounts.id", index=True, default=None)
    status: str = Field(index=True, nullable=False)  # success|failed|retrying
    attempt_number: int = Field(default=1)
    retry_count: int = Field(default=0)
    error_code: Optional[str] = Field(default=None)
    error_message: Optional[str] = Field(default=None)
    is_retryable: bool = Field(default=False)


class AIRequest(BaseModel, table=True):
    """A request/response pair to the AI service."""

    __tablename__ = "ai_requests"

    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    provider: Optional[str] = Field(default=None)
    model: Optional[str] = Field(default=None)
    action: Optional[str] = Field(default=None)  # generate_caption|rewrite|adapt|hashtags|ideas
    input_prompt: Optional[str] = Field(default=None)
    output_text: Optional[str] = Field(default=None)
    status: str = Field(default="completed")
    error_message: Optional[str] = Field(default=None)
