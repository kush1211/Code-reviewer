"""Tests for GitHub OAuth flow and JWT handling."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from jose import jwt

from app.config import get_settings
from app.services.auth_service import (
    decrypt_token,
    decode_jwt,
    encrypt_token,
    generate_state,
    get_login_url,
)

settings = get_settings()


class TestTokenEncryption:
    def test_roundtrip(self):
        from cryptography.fernet import Fernet

        # Use a real Fernet key for this test
        key = Fernet.generate_key().decode()
        with patch.object(settings, "FERNET_KEY", key):
            original = "ghp_supersecrettoken"
            encrypted = encrypt_token(original)
            assert isinstance(encrypted, bytes)
            decrypted = decrypt_token(encrypted)
            assert decrypted == original

    def test_encrypted_differs_from_original(self):
        from cryptography.fernet import Fernet

        key = Fernet.generate_key().decode()
        with patch.object(settings, "FERNET_KEY", key):
            enc = encrypt_token("mytoken")
            assert b"mytoken" not in enc


class TestJWT:
    def test_login_url_contains_client_id(self):
        state = generate_state()
        url = get_login_url(state)
        assert "github.com/login/oauth/authorize" in url
        assert state in url

    def test_state_is_random(self):
        s1 = generate_state()
        s2 = generate_state()
        assert s1 != s2

    def test_decode_valid_jwt(self):
        user_id = str(uuid.uuid4())
        from app.services.auth_service import _issue_jwt

        token = _issue_jwt(user_id)
        payload = decode_jwt(token)
        assert payload["sub"] == user_id

    def test_decode_expired_jwt_raises(self):
        from jose import jwt, JWTError

        expired_payload = {
            "sub": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        }
        token = jwt.encode(expired_payload, settings.JWT_SECRET, algorithm="HS256")
        with pytest.raises(JWTError):
            decode_jwt(token)


class TestAuthEndpoints:
    @pytest.mark.asyncio
    async def test_login_returns_github_url(self, client):
        response = await client.get("/auth/github/login")
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "github.com" in data["url"]

    @pytest.mark.asyncio
    async def test_get_me_returns_user(self, client, fake_user):
        response = await client.get("/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["github_username"] == fake_user.github_username

    @pytest.mark.asyncio
    async def test_logout(self, client):
        response = await client.post("/auth/logout")
        assert response.status_code == 200
