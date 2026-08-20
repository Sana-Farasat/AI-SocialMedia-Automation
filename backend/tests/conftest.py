import os
from pathlib import Path

import pytest

# Must be set before importing the app so the test DB is used.
TEST_DB = Path(__file__).parent / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["DEBUG"] = "false"
os.environ["RATE_LIMIT_ENABLED"] = "false"

import asyncio  # noqa: E402

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.db.session import async_engine  # noqa: E402
from app.main import app  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_db():
    """Drop and recreate all tables before every test for full isolation."""

    async def reset():
        async with async_engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.drop_all)
            await conn.run_sync(SQLModel.metadata.create_all)

    asyncio.run(reset())
    yield

    async def dispose():
        await async_engine.dispose()

    asyncio.run(dispose())


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.fixture
async def auth_client(client):
    """A client with a registered + logged in user."""
    resp = await client.post(
        "/api/auth/register",
        json={"email": "user@test.com", "password": "password123", "full_name": "Test User"},
    )
    assert resp.status_code == 201, resp.text
    return client
