# SocialPilot AI

Multi-platform AI social media automation SaaS. Connect your social accounts,
generate content with AI, schedule posts, and publish from a single dashboard —
all through official platform APIs.

## What it does

1. Sign up / log in (JWT auth, HTTP-only cookies)
2. Connect social accounts via OAuth (Facebook, Instagram, LinkedIn, X, Pinterest, TikTok, YouTube, Threads)
3. Create content with an AI assistant (captions, rewrites, platform adaptation, hashtags)
4. Publish now or schedule for later
5. A background worker publishes scheduled posts even when no one is viewing the site
6. Track publishing status and analytics from one place

## Monorepo layout

```
├── frontend/    Next.js 16 dashboard (App Router, TypeScript, Tailwind, shadcn/ui)
├── backend/     FastAPI REST API (Python 3.11+, SQLModel, PostgreSQL, JWT auth)
├── worker/      APScheduler background worker for due scheduled posts
├── OAUTH.md     Step-by-step OAuth + developer-app setup for every platform
└── PROMPT.md    Original product specification
```

| Package | README | Stack |
|---|---|---|
| Frontend | [frontend/README.md](frontend/README.md) | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, Framer Motion, Recharts |
| Backend | [backend/README.md](backend/README.md) | FastAPI, Pydantic, SQLModel/SQLAlchemy 2.0 (async), Alembic, PostgreSQL |
| Worker | (part of backend) | APScheduler, polls `schedules` every 15s |

## Quick start

### 1. Backend + worker

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows  (.venv/bin/activate on macOS/Linux)
pip install -e .                 # or: uv pip install -e .
cp .env.example .env             # fill in DATABASE_URL, SECRET_KEY, keys
alembic upgrade head             # run migrations

uvicorn app.main:app --reload --port 8000   # API → http://localhost:8000/docs
```

In a second terminal, start the publishing worker:

```bash
cd ..                            # repo root so `worker` is importable
python -m worker.main
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                      # → http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if the API is not on
`http://localhost:8000`.

## Key features

- **Auth** — register, login, logout, password reset, email-verification architecture, bcrypt hashing, HTTP-only cookies
- **AI assistant** — provider abstraction (OpenAI Agents SDK → Gemini), caption generation, rewriting, platform adaptation, hashtags
- **Scheduling** — real backend scheduler; posts publish even when nobody is online
- **8 platform adapters** — common `SocialProvider` interface, each respecting that platform's real API capabilities
- **Media storage** — provider abstraction: local / Cloudinary / S3 / Supabase
- **Analytics** — dashboard with metrics available from each platform's API
- **Retry & audit** — exponential backoff on transient failures, every attempt recorded, audit log

## Docs

- [Worker & scheduling](WORKER.md) — APScheduler worker **or** free cron-job.org trigger (no card needed)
- [Platform OAuth setup](OAUTH.md) — developer accounts, scopes, callback URLs, approval requirements
- [Backend API & configuration](backend/README.md)
- [Frontend dashboard](frontend/README.md)

## Platform capability notes

Adapters gate gracefully. Until a platform grants API approval, the dashboard shows
a **"Not configured / requires approval"** state — the app never bypasses platform
restrictions or uses unofficial APIs.

| Platform | Connect | Publish | Approval needed |
|---|---|---|---|
| Facebook Pages | ✅ | ✅ | `pages_manage_posts` (App Review for non-admin) |
| Instagram | ✅ | ⏳ | `instagram_content_publish` (Meta App Review) |
| LinkedIn | ✅ | ✅ | `w_member_social` (usually fast) |
| X / Twitter | ✅ | ✅ | Write-permission app |
| Pinterest | ✅ | ✅ | Write / Standard access |
| TikTok | ✅ | ⏳ | `video.publish` (TikTok review) |
| YouTube | ✅ | ⚠️ | `youtube.upload` + resumable upload flow |
| Threads | ✅ | ⏳ | `threads_content_publish` (Meta App Review) |

## Deployment

- **Frontend**: Vercel-compatible (`next build` / `next start`)
- **Backend**: deployable to any Python-compatible host; `backend/vercel.json` + `backend/api/index.py` provide a serverless (Vercel/Mangum) entry too
- **Database**: PostgreSQL 13+ (Neon works out of the box)
- **Worker**: run `python -m worker.main` as a long-lived process

## Security

- Passwords hashed with bcrypt (never plaintext)
- Access token in HTTP-only, Secure (production) cookie
- OAuth `state` is a signed token — CSRF protected
- Secrets, OAuth tokens, and AI keys never leave the server
- CORS restricted to `FRONTEND_URLS`