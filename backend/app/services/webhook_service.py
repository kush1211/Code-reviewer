from __future__ import annotations

import hashlib
import hmac
import json

import structlog
from redis import Redis
from rq import Queue
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.repositories import repo_repo
from app.services.auth_service import decrypt_token

logger = structlog.get_logger(__name__)
settings = get_settings()


def verify_signature(payload: bytes, signature_header: str | None, secret: str) -> bool:
    """Constant-time HMAC-SHA256 verification."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode(), payload, digestmod=hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)


async def handle_webhook(
    db: AsyncSession,
    raw_body: bytes,
    signature_header: str | None,
    event_type: str,
    redis_conn: Redis,
) -> dict:
    """
    Verify signature, identify the repo, enqueue review job.
    Returns immediately (< 200ms target).
    """
    body = json.loads(raw_body)

    # Get repo full_name from payload
    repo_full_name: str | None = None
    if "repository" in body:
        repo_full_name = body["repository"].get("full_name")

    if not repo_full_name:
        logger.warning("webhook_no_repo", event=event_type)
        return {"status": "ignored", "reason": "no repository in payload"}

    # Load connected repo from DB
    repo = await repo_repo.get_by_full_name(db, repo_full_name)
    if not repo:
        logger.info("webhook_repo_not_connected", full_name=repo_full_name)
        return {"status": "ignored", "reason": "repo not connected"}

    # Verify HMAC signature
    if repo.webhook_secret_encrypted:
        secret = decrypt_token(repo.webhook_secret_encrypted)
        if not verify_signature(raw_body, signature_header, secret):
            logger.warning("webhook_bad_signature", full_name=repo_full_name)
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Invalid webhook signature")

    # Only act on pull_request events
    if event_type != "pull_request":
        return {"status": "ignored", "reason": f"event={event_type}"}

    action = body.get("action")
    if action not in ("opened", "synchronize", "reopened"):
        return {"status": "ignored", "reason": f"action={action}"}

    pr_number = body.get("number")
    if not pr_number:
        return {"status": "ignored", "reason": "no pr number"}

    # Enqueue background job (non-blocking)
    q = Queue(connection=redis_conn)
    q.enqueue(
        "app.workers.review_worker.run_review",
        kwargs={"repo_id": str(repo.id), "pr_number": pr_number},
        job_timeout=600,
    )

    logger.info("webhook_enqueued", full_name=repo_full_name, pr_number=pr_number, action=action)
    return {"status": "queued"}
