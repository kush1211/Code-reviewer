from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import httpx
import structlog
from cryptography.fernet import Fernet
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User
from app.repositories import user_repo
from app.schemas.auth import TokenResponse

logger = structlog.get_logger(__name__)
settings = get_settings()

GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
ALGORITHM = "HS256"


# ─── Fernet helpers ───────────────────────────────────────────────────────────

def _fernet() -> Fernet:
    return Fernet(settings.FERNET_KEY.encode() if isinstance(settings.FERNET_KEY, str) else settings.FERNET_KEY)


def encrypt_token(plain: str) -> bytes:
    return _fernet().encrypt(plain.encode())


def decrypt_token(encrypted: bytes) -> str:
    return _fernet().decrypt(encrypted).decode()


# ─── JWT helpers ──────────────────────────────────────────────────────────────

def _issue_jwt(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_EXPIRY_SECONDS)
    payload = {"sub": user_id, "exp": exp}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])


# ─── State (CSRF) ─────────────────────────────────────────────────────────────

def generate_state() -> str:
    return secrets.token_urlsafe(32)


# ─── OAuth flow ───────────────────────────────────────────────────────────────

def get_login_url(state: str) -> str:
    params = (
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=repo,read:user"
        f"&state={state}"
    )
    return GITHUB_OAUTH_URL + params


async def exchange_code(db: AsyncSession, code: str) -> TokenResponse:
    """Exchange GitHub OAuth code for app JWT. Upserts user in DB."""
    async with httpx.AsyncClient() as client:
        # 1. Exchange code for GitHub access token
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
        github_token = token_data.get("access_token")
        if not github_token:
            raise ValueError(f"No access_token in GitHub response: {list(token_data.keys())}")

        # 2. Fetch GitHub user info
        user_resp = await client.get(
            GITHUB_USER_URL,
            headers={"Authorization": f"Bearer {github_token}", "Accept": "application/vnd.github+json"},
        )
        user_resp.raise_for_status()
        gh_user = user_resp.json()

    # 3. Encrypt token + upsert user
    encrypted = encrypt_token(github_token)
    user = await user_repo.upsert(
        db,
        github_id=gh_user["id"],
        github_username=gh_user["login"],
        access_token_encrypted=encrypted,
    )

    logger.info("user_authenticated", github_username=gh_user["login"])

    # 4. Issue app JWT
    app_token = _issue_jwt(str(user.id))
    return TokenResponse(access_token=app_token)


async def get_user_from_token(db: AsyncSession, token: str) -> User:
    from fastapi import HTTPException, status

    try:
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await user_repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
