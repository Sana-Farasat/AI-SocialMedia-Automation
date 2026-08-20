import re

import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _extract_reset_token(message: str) -> str:
    match = re.search(r"reset-password\?token=([^ ]+)", message)
    assert match, f"No reset link found in: {message}"
    return match.group(1)


@pytest.mark.anyio
async def test_forgot_password_returns_reset_link_without_smtp(client):
    await client.post(
        "/api/auth/register",
        json={"email": "reset@test.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/auth/forgot-password", json={"email": "reset@test.com"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Password reset link (SMTP not configured)" in data["message"]
    assert _extract_reset_token(data["message"])


@pytest.mark.anyio
async def test_forgot_password_does_not_leak_account_existence(client):
    resp = await client.post(
        "/api/auth/forgot-password", json={"email": "nobody@test.com"}
    )
    assert resp.status_code == 200
    assert "If an account exists with this email" in resp.json()["message"]


@pytest.mark.anyio
async def test_full_password_reset_flow(client):
    await client.post(
        "/api/auth/register",
        json={"email": "reset2@test.com", "password": "password123"},
    )
    forgot = await client.post(
        "/api/auth/forgot-password", json={"email": "reset2@test.com"}
    )
    token = _extract_reset_token(forgot.json()["message"])

    reset = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "brandnewpass1"},
    )
    assert reset.status_code == 200

    old = await client.post(
        "/api/auth/login",
        json={"email": "reset2@test.com", "password": "password123"},
    )
    assert old.status_code == 401

    new = await client.post(
        "/api/auth/login",
        json={"email": "reset2@test.com", "password": "brandnewpass1"},
    )
    assert new.status_code == 200


@pytest.mark.anyio
async def test_reset_password_rejects_invalid_token(client):
    resp = await client.post(
        "/api/auth/reset-password",
        json={"token": "not-a-real-token", "new_password": "brandnewpass1"},
    )
    assert resp.status_code == 400