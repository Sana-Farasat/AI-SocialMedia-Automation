from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Field, SQLModel


def uuid_str() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin(SQLModel):
    created_at: datetime = Field(default_factory=utcnow, nullable=False, index=True)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)


class BaseModel(TimestampMixin):
    id: str = Field(default_factory=uuid_str, primary_key=True)
