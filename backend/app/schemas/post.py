from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PostPlatformCreate(BaseModel):
    platform: str
    social_account_id: Optional[str] = None


class PostCreate(BaseModel):
    text: Optional[str] = None
    platforms: list[PostPlatformCreate] = Field(default_factory=list)
    media_ids: list[str] = Field(default_factory=list)
    status: str = "draft"  # draft | scheduled | publish_now


class PostSchedule(BaseModel):
    scheduled_at: datetime
    timezone: str = "UTC"


class PostUpdate(BaseModel):
    text: Optional[str] = None
    status: Optional[str] = None


class PostPlatformPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    platform: str
    social_account_id: Optional[str] = None
    status: str
    platform_post_id: Optional[str] = None
    platform_url: Optional[str] = None
    error_message: Optional[str] = None


class PostMediaPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_type: str
    mime_type: Optional[str] = None
    storage_key: Optional[str] = None
    public_url: Optional[str] = None
    size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None


class PostPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    text: Optional[str] = None
    status: str
    is_ai_generated: bool
    created_at: datetime
    updated_at: datetime
    platforms: list[PostPlatformPublic] = Field(default_factory=list)
    media: list[PostMediaPublic] = Field(default_factory=list)
