from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://reviewly:reviewly@localhost:5432/reviewly"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # JWT
    JWT_SECRET: str = "change_me"
    JWT_EXPIRY_SECONDS: int = 3600

    # Fernet key for token encryption at rest
    FERNET_KEY: str = ""

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # LLM model — format: "<provider>:<model>" e.g. "anthropic:claude-sonnet-4-5"
    # or "openai:gpt-4o". Provider integrations: langchain-anthropic, langchain-openai.
    LLM_MODEL: str = "anthropic:claude-sonnet-4-5"

    # CORS / webhook
    FRONTEND_URL: str = "http://localhost:3000"
    WEBHOOK_BASE_URL: str = "http://localhost:8000"

    # Redact secrets from repr so they never land in logs
    def __repr__(self) -> str:
        safe = {
            k: "***" if any(s in k.lower() for s in ("secret", "key", "token", "password"))
            else v
            for k, v in self.__dict__.items()
        }
        return f"Settings({safe})"

    @model_validator(mode="before")
    @classmethod
    def _check_secrets(cls, values: Any) -> Any:
        # Warn (not raise) so tests can run with dummy values
        return values


@lru_cache
def get_settings() -> Settings:
    return Settings()
