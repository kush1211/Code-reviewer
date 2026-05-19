from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    GitHubCallbackRequest,
    GitHubLoginResponse,
    LogoutResponse,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/github/login", response_model=GitHubLoginResponse)
async def github_login(request: Request) -> GitHubLoginResponse:
    state = auth_service.generate_state()
    url = auth_service.get_login_url(state)
    return GitHubLoginResponse(url=url)


@router.post("/github/callback", response_model=TokenResponse)
async def github_callback(
    body: GitHubCallbackRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await auth_service.exchange_code(db, body.code)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=LogoutResponse)
async def logout(current_user: User = Depends(get_current_user)) -> LogoutResponse:
    # JWT is stateless — client drops the token
    return LogoutResponse()
