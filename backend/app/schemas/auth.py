from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class GitHubLoginResponse(BaseModel):
    url: str


class GitHubCallbackRequest(BaseModel):
    code: str
    state: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    github_id: int
    github_username: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LogoutResponse(BaseModel):
    message: str = "Logged out"
