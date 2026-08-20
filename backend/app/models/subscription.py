from datetime import datetime
from typing import Optional

from sqlmodel import Field

from app.models.base import BaseModel, utcnow


class Subscription(BaseModel, table=True):
    __tablename__ = "subscriptions"

    user_id: str = Field(foreign_key="users.id", index=True, nullable=False)
    plan: str = Field(default="free")  # free|pro|business
    status: str = Field(default="active")
    starts_at: Optional[datetime] = Field(default=None)
    ends_at: Optional[datetime] = Field(default=None)
    external_id: Optional[str] = Field(default=None)


class AuditLog(BaseModel, table=True):
    __tablename__ = "audit_logs"

    user_id: Optional[str] = Field(foreign_key="users.id", index=True, default=None)
    action: str = Field(index=True, nullable=False)
    entity_type: Optional[str] = Field(default=None)
    entity_id: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)
    metadata_json: Optional[str] = Field(default=None, sa_column_kwargs={"name": "metadata"})
