from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repo import Repo


async def get_by_id(db: AsyncSession, repo_id: uuid.UUID) -> Repo | None:
    result = await db.execute(select(Repo).where(Repo.id == repo_id))
    return result.scalar_one_or_none()


async def get_by_github_repo_id(db: AsyncSession, user_id: uuid.UUID, github_repo_id: int) -> Repo | None:
    result = await db.execute(
        select(Repo).where(Repo.user_id == user_id, Repo.github_repo_id == github_repo_id)
    )
    return result.scalar_one_or_none()


async def list_connected(db: AsyncSession, user_id: uuid.UUID) -> list[Repo]:
    result = await db.execute(
        select(Repo).where(Repo.user_id == user_id, Repo.is_connected == True)  # noqa: E712
    )
    return list(result.scalars().all())


async def upsert(
    db: AsyncSession,
    user_id: uuid.UUID,
    github_repo_id: int,
    full_name: str,
) -> Repo:
    existing = await get_by_github_repo_id(db, user_id, github_repo_id)
    if existing:
        return existing

    repo = Repo(user_id=user_id, github_repo_id=github_repo_id, full_name=full_name)
    db.add(repo)
    await db.flush()
    await db.refresh(repo)
    return repo


async def mark_connected(
    db: AsyncSession,
    repo: Repo,
    webhook_id: int,
    webhook_secret_encrypted: bytes,
) -> Repo:
    repo.is_connected = True
    repo.webhook_id = webhook_id
    repo.webhook_secret_encrypted = webhook_secret_encrypted
    repo.connected_at = datetime.now(timezone.utc)
    await db.flush()
    return repo


async def mark_disconnected(db: AsyncSession, repo: Repo) -> Repo:
    repo.is_connected = False
    repo.webhook_id = None
    repo.webhook_secret_encrypted = None
    repo.connected_at = None
    await db.flush()
    return repo


async def get_by_full_name(db: AsyncSession, full_name: str) -> Repo | None:
    result = await db.execute(select(Repo).where(Repo.full_name == full_name, Repo.is_connected == True))  # noqa: E712
    return result.scalar_one_or_none()
