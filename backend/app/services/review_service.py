from __future__ import annotations

import uuid

import structlog
from redis import Redis
from rq import Queue
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import pr_repo, repo_repo, review_repo
from app.schemas.pr import PRDetailResponse, PRListItem, RerunResponse, ReviewCommentOut, ReviewOut

logger = structlog.get_logger(__name__)


async def list_prs(db: AsyncSession, user: User, repo_db_id: uuid.UUID) -> list[PRListItem]:
    repo = await repo_repo.get_by_id(db, repo_db_id)
    if not repo or repo.user_id != user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found")

    prs = await pr_repo.list_by_repo(db, repo_db_id)
    items: list[PRListItem] = []
    for pr in prs:
        review = await review_repo.get_by_pr_id(db, pr.id)
        items.append(
            PRListItem(
                id=pr.id,
                github_pr_number=pr.github_pr_number,
                title=pr.title,
                author=pr.author,
                head_sha=pr.head_sha,
                status=pr.status,
                created_at=pr.created_at,
                review_status=review.status if review else None,
                verdict=review.verdict if review else None,
            )
        )
    return items


async def get_pr_detail(db: AsyncSession, user: User, pr_db_id: uuid.UUID) -> PRDetailResponse:
    pr = await pr_repo.get_by_id(db, pr_db_id)
    if not pr:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Pull request not found")

    repo = await repo_repo.get_by_id(db, pr.repo_id)
    if not repo or repo.user_id != user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")

    review = await review_repo.get_by_pr_id(db, pr.id)
    review_out: ReviewOut | None = None
    if review:
        comments = [
            ReviewCommentOut(
                id=c.id,
                file_path=c.file_path,
                line_number=c.line_number,
                severity=c.severity,
                comment=c.comment,
                suggestion_code=c.suggestion_code,
            )
            for c in (review.comments or [])
        ]
        review_out = ReviewOut(
            id=review.id,
            status=review.status,
            verdict=review.verdict,
            summary_markdown=review.summary_markdown,
            started_at=review.started_at,
            completed_at=review.completed_at,
            comments=comments,
        )

    return PRDetailResponse(
        id=pr.id,
        github_pr_number=pr.github_pr_number,
        title=pr.title,
        author=pr.author,
        head_sha=pr.head_sha,
        base_sha=pr.base_sha,
        status=pr.status,
        created_at=pr.created_at,
        review=review_out,
    )


async def rerun_review(
    db: AsyncSession,
    user: User,
    pr_db_id: uuid.UUID,
    redis_conn: Redis,
) -> RerunResponse:
    pr = await pr_repo.get_by_id(db, pr_db_id)
    if not pr:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Pull request not found")

    repo = await repo_repo.get_by_id(db, pr.repo_id)
    if not repo or repo.user_id != user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")

    # Reset status
    await pr_repo.set_status(db, pr, "pending")

    q = Queue(connection=redis_conn)
    q.enqueue(
        "app.workers.review_worker.run_review",
        kwargs={"repo_id": str(repo.id), "pr_number": pr.github_pr_number},
        job_timeout=600,
    )

    logger.info("review_rerun_enqueued", pr_id=str(pr_db_id))
    return RerunResponse(message="Review re-queued", pr_id=pr_db_id)
