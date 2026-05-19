from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_by_github_id(db: AsyncSession, github_id: int) -> User | None:
    result = await db.execute(select(User).where(User.github_id == github_id))
    return result.scalar_one_or_none()


async def upsert(
    db: AsyncSession,
    github_id: int,
    github_username: str,
    access_token_encrypted: bytes,
) -> User:
    existing = await get_by_github_id(db, github_id)
    if existing:
        existing.github_username = github_username
        existing.access_token_encrypted = access_token_encrypted
        await db.flush()
        return existing

    user = User(
        github_id=github_id,
        github_username=github_username,
        access_token_encrypted=access_token_encrypted,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user
