from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pull_request import PullRequest


async def get_by_id(db: AsyncSession, pr_id: uuid.UUID) -> PullRequest | None:
    result = await db.execute(select(PullRequest).where(PullRequest.id == pr_id))
    return result.scalar_one_or_none()


async def get_by_repo_and_number(
    db: AsyncSession, repo_id: uuid.UUID, pr_number: int
) -> PullRequest | None:
    result = await db.execute(
        select(PullRequest).where(
            PullRequest.repo_id == repo_id,
            PullRequest.github_pr_number == pr_number,
        )
    )
    return result.scalar_one_or_none()


async def list_by_repo(db: AsyncSession, repo_id: uuid.UUID) -> list[PullRequest]:
    result = await db.execute(
        select(PullRequest)
        .where(PullRequest.repo_id == repo_id)
        .order_by(PullRequest.created_at.desc())
    )
    return list(result.scalars().all())


async def upsert(
    db: AsyncSession,
    repo_id: uuid.UUID,
    github_pr_number: int,
    title: str,
    author: str,
    head_sha: str,
    base_sha: str,
) -> PullRequest:
    existing = await get_by_repo_and_number(db, repo_id, github_pr_number)
    if existing:
        existing.title = title
        existing.author = author
        existing.head_sha = head_sha
        existing.base_sha = base_sha
        existing.status = "pending"
        await db.flush()
        return existing

    pr = PullRequest(
        repo_id=repo_id,
        github_pr_number=github_pr_number,
        title=title,
        author=author,
        head_sha=head_sha,
        base_sha=base_sha,
        status="pending",
    )
    db.add(pr)
    await db.flush()
    await db.refresh(pr)
    return pr


async def set_status(db: AsyncSession, pr: PullRequest, status: str) -> PullRequest:
    pr.status = status
    await db.flush()
    return pr
