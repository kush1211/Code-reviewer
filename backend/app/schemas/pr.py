from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class PRListItem(BaseModel):
    id: uuid.UUID
    github_pr_number: int
    title: str
    author: str
    head_sha: str
    status: str
    created_at: datetime
    review_status: str | None = None
    verdict: str | None = None

    model_config = {"from_attributes": True}


class ReviewCommentOut(BaseModel):
    id: uuid.UUID
    file_path: str
    line_number: int | None
    severity: str
    comment: str
    suggestion_code: str | None = None

    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    id: uuid.UUID
    status: str
    verdict: str | None
    summary_markdown: str | None
    started_at: datetime | None
    completed_at: datetime | None
    comments: list[ReviewCommentOut] = []

    model_config = {"from_attributes": True}


class PRDetailResponse(BaseModel):
    id: uuid.UUID
    github_pr_number: int
    title: str
    author: str
    head_sha: str
    base_sha: str
    status: str
    created_at: datetime
    review: ReviewOut | None = None

    model_config = {"from_attributes": True}


class RerunResponse(BaseModel):
    message: str
    pr_id: uuid.UUID
