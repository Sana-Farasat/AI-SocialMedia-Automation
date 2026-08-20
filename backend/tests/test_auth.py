import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_register_and_me(auth_client):
    resp = await auth_client.get("/api/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "user@test.com"
    assert data["full_name"] == "Test User"
    assert data["ai_provider"] == "openai"
    assert "id" in data


@pytest.mark.anyio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@test.com", "password": "password123"}
    first = await client.post("/api/auth/register", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/auth/register", json=payload)
    assert second.status_code == 409


@pytest.mark.anyio
async def test_login_and_logout(client):
    await client.post(
        "/api/auth/register",
        json={"email": "login@test.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/auth/login",
        json={"email": "login@test.com", "password": "password123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()

    me = await client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "login@test.com"

    out = await client.post("/api/auth/logout")
    assert out.status_code == 200
    me2 = await client.get("/api/auth/me")
    assert me2.status_code == 401


@pytest.mark.anyio
async def test_wrong_password(client):
    await client.post("/api/auth/register", json={"email": "wp@test.com", "password": "password123"})
    resp = await client.post("/api/auth/login", json={"email": "wp@test.com", "password": "wrongpass1"})
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
