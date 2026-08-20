# SocialPilot AI — Backend

FastAPI REST API for the SocialPilot AI multi-platform social media automation
SaaS: auth, social account management (OAuth), posts, media, AI content, analytics,
and a publishing worker.

## Tech stack

- Python 3.11+ · FastAPI · Pydantic v2 · SQLModel / SQLAlchemy 2.0 (async)
- PostgreSQL 13+ (Neon-compatible); SQLite fallback for local dev
- Alembic migrations
- JWT auth with HTTP-only cookies + bcrypt password hashing
- AI via the **OpenAI Agents SDK** pointed at Gemini's OpenAI-compatible endpoint
- Background publishing: APScheduler (`worker/` at the repo root)
- Storage abstraction: local / Cloudinary / S3 / Supabase
- Optional serverless entry (Vercel / Mangum): `api/index.py`

## Project structure

```
backend/
  app/
    api/routes/   # auth, users, social_accounts, posts, media, ai, analytics, worker
    core/         # config, security (settings, JWT, bcrypt)
    db/           # async engine + session
    models/       # SQLModel tables (User, SocialAccount, Post, Media, Schedule, ...)
    schemas/      # Pydantic request/response models
    services/     # auth, posts, publishing, scheduler, social, storage, audit, email, ai/
    integrations/ # social provider adapters (linkedin, meta, twitter, pinterest, tiktok, youtube, threads)
  alembic/        # migrations
  api/index.py    # serverless entry point (Mangum)
  tests/          # pytest suite (auth, password reset, posts, publishing)
  vercel.json     # Vercel serverless config
```

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (.venv/bin/activate on macOS/Linux)
uv pip install -e .             # or: pip install -e .
cp .env.example .env            # then edit with real values
```

## Database

Neon PostgreSQL is expected (any PostgreSQL 13+ works). For a quick local run you
can use SQLite: set `DATABASE_URL=sqlite+aiosqlite:///./dev.db` in `.env`.

```bash
alembic upgrade head            # apply migrations
alembic revision --autogenerate -m "message"   # create a new migration
```

## Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

- Interactive docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI: http://localhost:8000/api/openapi.json
- Health: http://localhost:8000/api/health

## Run the worker

The scheduler publishes due posts independently of the UI. Two ways to run it:

1. **APScheduler worker** — polls the `schedules` table every 15s and publishes
   due posts with retry + exponential backoff, recording every `PublishAttempt`:

   ```bash
   cd ..                          # repo root so `worker` is importable
   python -m worker.main          # or: socialpilot-worker
   ```

2. **HTTP trigger (external cron)** — hit `GET /api/worker/process-due?token=<WORKER_TOKEN>`
   from a scheduler like **cron-job.org** (free, no credit card). The endpoint
   runs the same publishing logic and is guarded by `WORKER_TOKEN` (falls back to
   `SECRET_KEY` if unset).

See [WORKER.md](../WORKER.md) for the full worker + cron-job.org deployment guide.

## Tests

```bash
pytest -q
```

Tests mock external social APIs — no real calls are ever made.

## API routes

All routes are prefixed with `/api`.

| Router | Endpoints |
|---|---|
| `/auth` | register, login, logout, me, refresh, verify email, password reset |
| `/users` | profile, settings, change password |
| `/social-accounts` | list, connect (OAuth), callback, disconnect, platform status |
| `/posts` | CRUD, publish now, schedule, drafts, status |
| `/media` | upload files (validated by type/size), list, delete |
| `/ai` | generate content, rewrite, adapt for platform |
| `/analytics` | overview, per-account metrics |
| `/worker` | worker status / diagnostics |

## Environment variables

Copy `backend/.env.example` to `.env` and fill in your values. Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) or SQLite fallback |
| `SECRET_KEY` | Token signing secret — generate `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | AI provider keys |
| `DEFAULT_AI_PROVIDER` / `DEFAULT_AI_MODEL` | e.g. `gemini` / `gemini-2.0-flash` |
| `META_CLIENT_ID` / `META_CLIENT_SECRET` | Facebook / Instagram / Threads OAuth |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X / Twitter OAuth |
| `PINTEREST_CLIENT_ID` / `PINTEREST_CLIENT_SECRET` | Pinterest OAuth |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok OAuth |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | YouTube (Google) OAuth |
| `STORAGE_PROVIDER` | `local` \| `cloudinary` \| `s3` \| `supabase` |
| `FRONTEND_URLS` | JSON list of allowed CORS origins |
| `REDIS_URL` | Optional Redis connection for worker state |
| `EMAIL_VERIFICATION_REQUIRED`, `SMTP_*`, `MAIL_FROM` | Email verification / password reset |
| `RATE_LIMIT_ENABLED`, `RATE_LIMIT_DEFAULT_PER_MINUTE` | Rate limiting |

See `backend/.env.example` and [OAUTH.md](../OAUTH.md) for full details.

## Social platforms & approval notes

Each adapter implements the common `SocialProvider` interface and surfaces a
graceful **"Not configured" / "requires approval"** state when credentials are
missing or Meta/Google approval is pending:

- **LinkedIn**: works with `w_member_social` scope.
- **Facebook Pages**: works via Graph API with a Page token.
- **Instagram**: `instagram_content_publish` requires Meta **App Review** — until granted, shows approval-required.
- **X / Twitter**: OAuth 2.0 with code + PKCE; requires write-permission app.
- **Pinterest / TikTok / YouTube / Threads**: require their own developer-app approval; wired and gated on env credentials.

Full setup instructions for every platform: [OAUTH.md](../OAUTH.md).

## Security

- Passwords hashed with bcrypt (never plaintext)
- Access token in HTTP-only, Secure (prod) cookie
- OAuth `state` is a signed token — CSRF protected
- OAuth client secrets / tokens / AI keys never leave the server
- Production CORS via `FRONTEND_URLS`
- Rate limiting architecture (`RATE_LIMIT_*` env vars)