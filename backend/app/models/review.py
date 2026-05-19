from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pr_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    # pending | reviewing | completed | failed
    status: Mapped[str] = mapped_column(Text, default="pending", nullable=False)
    # approved | changes_requested | commented
    verdict: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_llm_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    pull_request: Mapped["PullRequest"] = relationship("PullRequest", back_populates="reviews")  # type: ignore[name-defined]
    comments: Mapped[list["ReviewComment"]] = relationship("ReviewComment", back_populates="review", lazy="select", cascade="all, delete-orphan")  # type: ignore[name-defined]
