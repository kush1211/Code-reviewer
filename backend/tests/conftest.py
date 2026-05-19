from __future__ import annotations

import uuid
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.database import Base, get_db
from app.dependencies import get_current_user, get_redis
from app.main import app
from app.models.user import User

# ─── Test settings override ───────────────────────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def test_settings(monkeypatch_session=None):
    settings = get_settings()
    return settings


# ─── In-memory SQLite for tests ───────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


# ─── Fake user fixture ────────────────────────────────────────────────────────

@pytest.fixture
def fake_user() -> User:
    from datetime import datetime, timezone
    from cryptography.fernet import Fernet
    key = Fernet.generate_key()
    f = Fernet(key)
    user = User(
        id=uuid.uuid4(),
        github_id=12345,
        github_username="testuser",
        access_token_encrypted=f.encrypt(b"fake_github_token"),
    )
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    return user


# ─── Test HTTP client with overridden deps ────────────────────────────────────

@pytest_asyncio.fixture
async def client(db_session: AsyncSession, fake_user: User) -> AsyncGenerator[AsyncClient, None]:
    mock_redis = MagicMock()
    mock_redis.enqueue = MagicMock()

    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_redis] = lambda: mock_redis

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ─── Mock Redis queue ─────────────────────────────────────────────────────────

@pytest.fixture
def mock_redis():
    r = MagicMock()
    queue = MagicMock()
    queue.enqueue = MagicMock(return_value=MagicMock(id="fake-job-id"))
    r.Queue = MagicMock(return_value=queue)
    return r
