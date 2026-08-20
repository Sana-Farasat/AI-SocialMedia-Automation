from typing import Optional

from sqlmodel import Field

from app.models.base import BaseModel, utcnow


class Analytics(BaseModel, table=True):
    """Snapshot of platform analytics fetched from official APIs."""

    __tablename__ = "analytics"

    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    social_account_id: str = Field(foreign_key="social_accounts.id", index=True, nullable=False)
    platform: str = Field(index=True, nullable=False)
    period: Optional[str] = Field(default=None)  # day|week|month
    metric_name: str = Field(index=True, nullable=False)  # likes|comments|shares|impressions|reach|followers...
    metric_value: Optional[float] = Field(default=None)
    post_id: Optional[str] = Field(foreign_key="posts.id", index=True, default=None)
