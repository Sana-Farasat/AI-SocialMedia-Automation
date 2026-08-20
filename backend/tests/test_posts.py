import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_create_and_list_posts(auth_client):
    resp = await auth_client.post(
        "/api/posts",
        json={"text": "Hello world", "platforms": [{"platform": "twitter"}]},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["text"] == "Hello world"
    assert data["status"] == "draft"
    assert data["platforms"][0]["platform"] == "twitter"

    listed = await auth_client.get("/api/posts")
    assert listed.status_code == 200
    assert len(listed.json()) == 1


@pytest.mark.anyio
async def test_schedule_post(auth_client):
    created = await auth_client.post(
        "/api/posts",
        json={"text": "Scheduled", "platforms": [{"platform": "linkedin"}]},
    )
    pid = created.json()["id"]

    sched = await auth_client.post(
        f"/api/posts/{pid}/schedule",
        json={"scheduled_at": "2026-08-13T10:00:00Z", "timezone": "UTC"},
    )
    assert sched.status_code == 200
    assert sched.json()["status"] == "scheduled"


@pytest.mark.anyio
async def test_get_post_detail(auth_client):
    created = await auth_client.post("/api/posts", json={"text": "Detail"})
    pid = created.json()["id"]
    detail = await auth_client.get(f"/api/posts/{pid}")
    assert detail.status_code == 200
    assert detail.json()["text"] == "Detail"


@pytest.mark.anyio
async def test_posts_isolated_between_users(client):
    await client.post("/api/auth/register", json={"email": "u1@t.com", "password": "password123"})
    await client.post("/api/auth/register", json={"email": "u2@t.com", "password": "password123"})
    # both logged in as u2 now (register sets cookie)
    await client.post("/api/posts", json={"text": "u2 post"})
    listed = await client.get("/api/posts")
    assert len(listed.json()) == 1
