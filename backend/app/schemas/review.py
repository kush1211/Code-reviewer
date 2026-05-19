from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LLMComment(BaseModel):
    file: str
    line: int
    severity: Literal["critical", "warning", "suggestion", "nitpick"]
    comment: str
    suggestion: str | None = None


class LLMReviewResponse(BaseModel):
    verdict: Literal["approved", "changes_requested", "commented"]
    summary: str = Field(..., description="Markdown string, 2-4 paragraphs")
    comments: list[LLMComment] = Field(default_factory=list)
