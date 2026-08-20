from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models import Media, User
from app.services.storage import generate_key, get_storage_backend, validate_file
from pydantic import ConfigDict, BaseModel


class MediaPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_type: str
    mime_type: Optional[str] = None
    storage_key: Optional[str] = None
    public_url: Optional[str] = None
    size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None


router = APIRouter(prefix="/media", tags=["media"])


@router.post("", response_model=MediaPublic, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    try:
        file_type, mime, size = validate_file(file)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    key = generate_key(user.id, file.filename or "file")
    try:
        content = await file.read()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not read file") from exc

    backend = get_storage_backend()
    try:
        public_url = await backend.upload(key, content, mime)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Upload failed") from exc

    media = Media(
        user_id=user.id,
        file_type=file_type,
        mime_type=mime,
        storage_key=key,
        public_url=public_url,
        size_bytes=size,
    )
    session.add(media)
    await session.commit()
    await session.refresh(media)
    return media


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    media = await session.get(Media, media_id)
    if not media or media.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    backend = get_storage_backend()
    if media.storage_key:
        try:
            await backend.delete(media.storage_key)
        except Exception:  # noqa: BLE001
            pass
    await session.delete(media)
    await session.commit()
    return None


@router.get("", response_model=list[MediaPublic])
async def list_media(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    from sqlmodel import select

    result = await session.execute(select(Media).where(Media.user_id == user.id).order_by(Media.created_at.desc()))
    return result.scalars().all()
