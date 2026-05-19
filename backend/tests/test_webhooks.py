"""Tests for webhook signature verification and job enqueue behavior."""
from __future__ import annotations

import hashlib
import hmac
import json

import pytest

from app.services.webhook_service import verify_signature


class TestSignatureVerification:
    def _make_sig(self, payload: bytes, secret: str) -> str:
        digest = hmac.new(secret.encode(), payload, digestmod=hashlib.sha256).hexdigest()
        return f"sha256={digest}"

    def test_valid_signature_accepted(self):
        payload = b'{"action": "opened"}'
        secret = "mysecret"
        sig = self._make_sig(payload, secret)
        assert verify_signature(payload, sig, secret) is True

    def test_invalid_signature_rejected(self):
        payload = b'{"action": "opened"}'
        assert verify_signature(payload, "sha256=badvalue", "mysecret") is False

    def test_missing_signature_rejected(self):
        assert verify_signature(b"payload", None, "mysecret") is False

    def test_wrong_prefix_rejected(self):
        payload = b"payload"
        secret = "mysecret"
        # md5 prefix instead of sha256
        assert verify_signature(payload, "md5=something", secret) is False

    def test_tampered_payload_rejected(self):
        original = b'{"action": "opened"}'
        secret = "mysecret"
        sig = self._make_sig(original, secret)
        tampered = b'{"action": "closed"}'
        assert verify_signature(tampered, sig, secret) is False

    def test_wrong_secret_rejected(self):
        payload = b'{"action": "opened"}'
        sig = self._make_sig(payload, "correct_secret")
        assert verify_signature(payload, sig, "wrong_secret") is False

    def test_empty_payload_valid_sig(self):
        payload = b""
        secret = "s"
        sig = self._make_sig(payload, secret)
        assert verify_signature(payload, sig, secret) is True


class TestWebhookEndpoint:
    """Integration tests for POST /webhooks/github."""

    @pytest.mark.asyncio
    async def test_webhook_returns_ignored_for_non_pr_event(self, client):
        payload = json.dumps({"repository": {"full_name": "org/repo"}}).encode()
        response = await client.post(
            "/webhooks/github",
            content=payload,
            headers={
                "X-GitHub-Event": "push",
                "X-Hub-Signature-256": "sha256=fake",
                "Content-Type": "application/json",
            },
        )
        # Will be 200 ignored (repo not connected in test DB)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_webhook_health_check(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
