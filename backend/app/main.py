# from fastapi import APIRouter, FastAPI, Request, staticfiles
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    ai,
    analytics,
    auth,
    media,
    posts,
    social_accounts,
    users,
    worker,
)
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="SocialPilot AI - Multi-platform AI Social Media Automation SaaS backend REST API.",
    debug=settings.DEBUG,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


api = APIRouter()
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(social_accounts.router, prefix=settings.API_PREFIX)
app.include_router(posts.router, prefix=settings.API_PREFIX)
app.include_router(media.router, prefix=settings.API_PREFIX)
app.include_router(ai.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(worker.router, prefix=settings.API_PREFIX)

# from pathlib import Path  # noqa: E402

# _uploads = Path(__file__).resolve().parent.parent / "uploads"
# try:
#     _uploads.mkdir(parents=True, exist_ok=True)
#     app.mount("/static/media", staticfiles.StaticFiles(directory=_uploads), name="media")
# except OSError:
#     _uploads = Path("/tmp") / "socialpilot-uploads"
#     _uploads.mkdir(parents=True, exist_ok=True)
#     app.mount("/static/media", staticfiles.StaticFiles(directory=_uploads), name="media")


# Vercel serverless filesystem is read-only except /tmp.
# _uploads = Path("/tmp/socialpilot-uploads")
# _uploads.mkdir(parents=True, exist_ok=True)

# app.mount(
#     "/static/media",
#     staticfiles.StaticFiles(directory=_uploads),
#     name="media",
# )

@app.get(f"{settings.API_PREFIX}/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}
