from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class RepoResponse(BaseModel):
    id: uuid.UUID
    github_repo_id: int
    full_name: str
    is_connected: bool
    connected_at: datetime | None = None

    model_config = {"from_attributes": True}


class RepoDetailResponse(BaseModel):
    id: uuid.UUID
    github_repo_id: int
    full_name: str
    is_connected: bool
    connected_at: datetime | None = None
    total_prs: int = 0
    open_prs: int = 0
    reviewed_prs: int = 0
    total_issues: int = 0

    model_config = {"from_attributes": True}


# Used when listing from GitHub API (not yet in DB)
class GitHubRepoItem(BaseModel):
    github_repo_id: int
    full_name: str
    private: bool
    description: str | None = None
    updated_at: str | None = None
    open_issues_count: int = 0
    is_connected: bool = False
    db_id: uuid.UUID | None = None


class ConnectResponse(BaseModel):
    message: str
    repo: RepoResponse


class DisconnectResponse(BaseModel):
    message: str
