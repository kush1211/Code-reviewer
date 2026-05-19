from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.review import Review
from app.models.review_comment import ReviewComment
from app.schemas.review import LLMReviewResponse


async def get_by_pr_id(db: AsyncSession, pr_id: uuid.UUID) -> Review | None:
    result = await db.execute(
        select(Review)
        .where(Review.pr_id == pr_id)
        .options(selectinload(Review.comments))
    )
    return result.scalar_one_or_none()


async def upsert_review(
    db: AsyncSession,
    pr_id: uuid.UUID,
    status: str = "pending",
) -> Review:
    existing = await get_by_pr_id(db, pr_id)
    if existing:
        existing.status = status
        existing.verdict = None
        existing.summary_markdown = None
        existing.raw_llm_response = None
        existing.started_at = datetime.now(timezone.utc)
        existing.completed_at = None
        await db.flush()
        return existing

    review = Review(pr_id=pr_id, status=status, started_at=datetime.now(timezone.utc))
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return review


async def complete_review(
    db: AsyncSession,
    review: Review,
    llm_response: LLMReviewResponse,
    raw: dict,
) -> Review:
    review.status = "completed"
    review.verdict = llm_response.verdict
    review.summary_markdown = llm_response.summary
    review.raw_llm_response = raw
    review.completed_at = datetime.now(timezone.utc)

    # Delete old comments (idempotent re-run)
    await db.execute(delete(ReviewComment).where(ReviewComment.review_id == review.id))

    for c in llm_response.comments:
        comment = ReviewComment(
            review_id=review.id,
            file_path=c.file,
            line_number=c.line,
            severity=c.severity,
            comment=c.comment,
            suggestion_code=c.suggestion,
        )
        db.add(comment)

    await db.flush()
    return review


async def mark_failed(db: AsyncSession, review: Review) -> Review:
    review.status = "failed"
    review.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return review
