from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.services.scheduler import process_due_schedules

router = APIRouter(prefix="/worker", tags=["worker"])


@router.get("/process-due")
async def process_due(
    token: str = Query(...),
    session: AsyncSession = Depends(get_session),
):
    """Publish all due scheduled posts.

    Intended to be triggered by an external scheduler (e.g. cron-job.org) in
    deployments where the background worker cannot run. Guarded by a secret
    token to prevent abuse.
    """
    if token != (settings.WORKER_TOKEN or settings.SECRET_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid worker token",
        )
    return await process_due_schedules(session)