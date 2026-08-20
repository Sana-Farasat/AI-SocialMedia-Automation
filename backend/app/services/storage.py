import io
import uuid
from abc import ABC, abstractmethod
from typing import BinaryIO, Optional

from fastapi import UploadFile

from app.core.config import settings

ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_MIME = {"video/mp4", "video/quicktime", "video/webm"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_VIDEO_BYTES = 100 * 1024 * 1024  # 100 MB


class StorageBackend(ABC):
    @abstractmethod
    async def upload(self, key: str, content: bytes, content_type: str) -> str:
        """Upload content and return a public URL."""
        raise NotImplementedError

    @abstractmethod
    async def delete(self, key: str) -> None:
        raise NotImplementedError


class LocalStorageBackend(StorageBackend):
    """Dev-only local storage. In production use an object storage backend."""

    def __init__(self) -> None:
        self._base = "uploads"

    def _path(self, key: str):
        import os

        from pathlib import Path

        path = Path(self._base) / key
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    async def upload(self, key: str, content: bytes, content_type: str) -> str:
        path = self._path(key)
        path.write_bytes(content)
        return f"/static/media/{key}"

    async def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


def get_storage_backend() -> StorageBackend:
    provider = (settings.STORAGE_PROVIDER or "local").lower()
    if provider == "s3":
        return S3StorageBackend()
    if provider == "cloudinary":
        return CloudinaryStorageBackend()
    if provider == "supabase":
        return SupabaseStorageBackend()
    return LocalStorageBackend()


def validate_file(upload: UploadFile) -> tuple[str, str, int]:
    """Validate file type, size, dimensions. Returns (file_type, mime, size)."""
    content = upload.file.read()
    size = len(content)
    mime = upload.content_type or ""
    upload.file.seek(0)

    if mime in ALLOWED_IMAGE_MIME:
        file_type = "image"
        if size > MAX_IMAGE_BYTES:
            raise ValueError("Image exceeds the 5 MB size limit")
    elif mime in ALLOWED_VIDEO_MIME:
        file_type = "video"
        if size > MAX_VIDEO_BYTES:
            raise ValueError("Video exceeds the 100 MB size limit")
    else:
        raise ValueError(f"Unsupported file type: {mime}")

    return file_type, mime, size


def generate_key(user_id: str, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"users/{user_id}/{uuid.uuid4().hex}.{ext}"


# Registrations kept import-safe (optional deps).
def _cloudinary():
    from cloudinary import config, uploader

    config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    return uploader


class CloudinaryStorageBackend(StorageBackend):
    async def upload(self, key: str, content: bytes, content_type: str) -> str:
        uploader = _cloudinary()
        result = uploader.upload(
            io.BytesIO(content), public_id=key.rsplit(".", 1)[0], resource_type="auto"
        )
        return result["secure_url"]

    async def delete(self, key: str) -> None:
        _cloudinary().destroy(key.rsplit(".", 1)[0])


class S3StorageBackend(StorageBackend):
    async def upload(self, key: str, content: bytes, content_type: str) -> str:
        import boto3

        client = boto3.client(
            "s3",
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL or None,
        )
        client.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=content, ContentType=content_type)
        return f"https://{settings.S3_BUCKET}.s3.{settings.S3_REGION}.amazonaws.com/{key}"

    async def delete(self, key: str) -> None:
        import boto3

        client = boto3.client(
            "s3",
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL or None,
        )
        client.delete_object(Bucket=settings.S3_BUCKET, Key=key)


class SupabaseStorageBackend(StorageBackend):
    async def upload(self, key: str, content: bytes, content_type: str) -> str:
        import httpx

        url = f"{settings.SUPABASE_STORAGE_URL}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{key}"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": content_type,
                },
                content=content,
            )
            resp.raise_for_status()
        return f"{settings.SUPABASE_STORAGE_URL}/storage/v1/object/public/{settings.SUPABASE_STORAGE_BUCKET}/{key}"

    async def delete(self, key: str) -> None:
        import httpx

        url = f"{settings.SUPABASE_STORAGE_URL}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{key}"
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                url,
                headers={"Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"},
            )
            resp.raise_for_status()
