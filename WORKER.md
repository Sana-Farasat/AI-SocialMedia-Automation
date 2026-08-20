# SocialPilot AI — Worker & Scheduling Guide

This guide explains how scheduled posts get published, and every supported way
to run the publishing worker — including the **free, no-credit-card** setup using
[cron-job.org](https://cron-job.org).

---

## How scheduling works

1. A user schedules a post → a row is created in the `schedules` table with
   `status = "scheduled"` and a `scheduled_at` timestamp.
2. Something must periodically pick up rows where `scheduled_at <= now` and
   publish them via the platform adapters (with retry + exponential backoff,
   recording every `PublishAttempt`).
3. The two trigger options are:

| Option | What runs it | Cadence | Cost |
|---|---|---|---|
| **APScheduler worker** (`worker/main.py`) | Long-lived Python process | every 15s | hosting cost |
| **HTTP trigger** (`GET /api/worker/process-due`) | External cron (e.g. cron-job.org) | every 1 min min | free |

Both call the same logic: `app/services/scheduler.py::process_due_schedules`.

---

## Option A — APScheduler worker (default)

Run the background scheduler directly. It polls every 15 seconds and works even
when nobody is viewing the site.

```bash
# from the repo root (so `worker` is importable)
python -m worker.main

# or, after installing the backend package:
socialpilot-worker
```

Best for: an always-on host where you can keep a long-lived process alive
(Railway, Render, a VPS, PythonAnywhere, etc.).

---

## Option B — cron-job.org (free, no card) ⭐

[cron-job.org](https://cron-job.org) is a hosted cron scheduler. **It cannot run
Python code** — it only sends HTTP requests to a URL at a set interval. So you
point it at the backend's trigger endpoint instead of the worker process.

### Backend endpoint

```
GET /api/worker/process-due?token=<WORKER_TOKEN>
```

This endpoint runs the exact same publishing logic as the APScheduler worker.
It is protected by a token so nobody else can trigger it.

### 1. Set `WORKER_TOKEN`

Add it to your backend environment (e.g. `backend/.env` or your host's env vars):

```
WORKER_TOKEN=<long-random-string>
```

Generate one:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

> **Why a separate token?** The token lives in the URL that cron-job.org stores
> and logs. Using `SECRET_KEY` there would expose your session-signing secret to
> a third party. `WORKER_TOKEN` falls back to `SECRET_KEY` if empty (backward
> compatible), but you should set it explicitly.
>
> If you have already deployed with the old `SECRET_KEY`-based URL, switch to
> `WORKER_TOKEN` and update the cron-job URL.

### 2. Deploy the backend publicly

cron-job.org needs a public **HTTPS** URL, e.g. `https://your-api.example.com`.
Localhost will not work.

### 3. Test the endpoint manually

Open in a browser or Postman:

```
https://your-api.example.com/api/worker/process-due?token=<WORKER_TOKEN>
```

Expected response: `{"processed": 0, "published": 0, "failed": 0}` (200).
A `401 Unauthorized` means the token is wrong.

### 4. Create the cron job

1. Register at https://cron-job.org (email + password — **no credit card**).
2. Dashboard → **New cronjob**.
3. **URL / Address:** paste the endpoint URL from above.
4. **Request method:** `GET`.
5. **Schedule:** choose *"Execute at flexible intervals"* and set **1 minute**.
   - ⚠️ cron-job.org's minimum interval is **once per minute** (60x/hour).
     Posts can therefore be published up to ~1 minute late. Acceptable for
     typical scheduling.
6. **Save.**

### 5. Test run & monitor

- Use the job's **Execute** button for a manual test run.
- **Last executions** shows status code + response for the last 50 runs.
- Enable **e-mail on failure** so you get notified if a run fails.

### cron-job.org free-plan limits

| Limit | Value |
|---|---|
| Minimum interval | 1 minute |
| Request timeout | **30 seconds** (heavy video uploads may time out) |
| Response read | ~64 KB (our tiny JSON is fine) |
| Auto-disable | After ~25 consecutive failures |

### cron-job.org caveats & mitigations

- **30s timeout / host limits:** for text posts this is fine. For large media
  (YouTube/TikTok videos), the synchronous endpoint may exceed the limit.
  Options:
  - Keep posts light (images, text) on this setup.
  - Split the trigger into a queue that returns immediately (`202`) and let the
    backend process asynchronously.
  - Use Option A on an always-on host for heavy publishing.
- **1-minute granularity:** posts scheduled "in the next minute" may fire up to
  1 minute late.
- **HTTPS required:** deploy with a real domain/HTTPS; free Vercel domains work.

---

## Which option should I use?

| Scenario | Recommendation |
|---|---|
| Free, no card, light publishing (text + images) | **Option B — cron-job.org** |
| Video-heavy publishing (YouTube / TikTok) | **Option A** on an always-on free host (Railway/Render) |
| Sub-minute scheduling precision needed | **Option A** (15s polling) |
| Production with lots of posts | **Option A** (long-lived process + Redis) |

---

## Relevant files

| Path | Purpose |
|---|---|
| `worker/main.py` | APScheduler loop (15s poll) |
| `app/services/scheduler.py` | Shared `process_due_schedules` logic |
| `app/api/routes/worker.py` | HTTP trigger endpoint (`/api/worker/process-due`) |
| `app/core/config.py` | `WORKER_TOKEN` / `REDIS_URL` settings |
| `backend/.env.example` | Env var reference (`WORKER_TOKEN`, `REDIS_URL`) |