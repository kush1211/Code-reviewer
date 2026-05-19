from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_redis
from app.models.user import User
from app.schemas.pr import PRDetailResponse, PRListItem, RerunResponse
from app.services import review_service

router = APIRouter(tags=["prs"])


@router.get("/repos/{repo_id}/prs", response_model=list[PRListItem])
async def list_prs(
    repo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PRListItem]:
    return await review_service.list_prs(db, current_user, repo_id)


@router.get("/prs/{pr_id}", response_model=PRDetailResponse)
async def get_pr(
    pr_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PRDetailResponse:
    return await review_service.get_pr_detail(db, current_user, pr_id)


@router.post("/prs/{pr_id}/rerun", response_model=RerunResponse)
async def rerun_review(
    pr_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    redis_conn=Depends(get_redis),
) -> RerunResponse:
    return await review_service.rerun_review(db, current_user, pr_id, redis_conn)
