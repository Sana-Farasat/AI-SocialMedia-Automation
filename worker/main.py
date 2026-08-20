"""Background scheduler for processing due scheduled posts.

Runs independently of the FastAPI backend and the frontend, so scheduled posts
are published even when no user is viewing the site. Built on APScheduler's
AsyncIOScheduler.

Design:
  - A periodic job scans the `schedules` table for rows whose scheduled_at is due
    and status == "scheduled".
  - For each due schedule, it loads the linked Post + PostPlatforms and publishes
    to each configured platform via the provider abstraction, with retry/backoff.
  - It then marks the schedule (and post) as processed/published/failed.

Run it with:
    python -m worker.main            (from the repo root)
or:  socialpilot-worker
"""

import sys
import asyncio
from pathlib import Path

# Make the backend `app` package importable.
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # noqa: E402
from apscheduler.triggers.interval import IntervalTrigger  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.services.scheduler import process_due_schedules  # noqa: E402

POLL_INTERVAL_SECONDS = 15


async def poll() -> None:
    async with SessionLocal() as session:
        await process_due_schedules(session)


def main() -> None:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        poll,
        trigger=IntervalTrigger(seconds=POLL_INTERVAL_SECONDS),
        id="process_due_schedules",
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    print(f"SocialPilot AI worker started. Polling every {POLL_INTERVAL_SECONDS}s...")
    try:
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()


if __name__ == "__main__":
    main()
