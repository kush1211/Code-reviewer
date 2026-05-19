from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.repo import (
    ConnectResponse,
    DisconnectResponse,
    GitHubRepoItem,
    RepoDetailResponse,
)
from app.services import repo_service

router = APIRouter(prefix="/repos", tags=["repos"])


@router.get("", response_model=list[GitHubRepoItem])
async def list_repos(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GitHubRepoItem]:
    return await repo_service.list_repos(db, current_user)


@router.post("/{github_repo_id}/connect", response_model=ConnectResponse)
async def connect_repo(
    github_repo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConnectResponse:
    return await repo_service.connect_repo(db, current_user, github_repo_id)


@router.post("/{repo_id}/disconnect", response_model=DisconnectResponse)
async def disconnect_repo(
    repo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DisconnectResponse:
    return await repo_service.disconnect_repo(db, current_user, repo_id)


@router.get("/{repo_id}", response_model=RepoDetailResponse)
async def get_repo(
    repo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RepoDetailResponse:
    return await repo_service.get_repo_detail(db, current_user, repo_id)
