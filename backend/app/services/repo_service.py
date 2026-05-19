from __future__ import annotations

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.github.client import AsyncGitHubClient
from app.models.user import User
from app.repositories import repo_repo
from app.schemas.repo import ConnectResponse, DisconnectResponse, GitHubRepoItem, RepoDetailResponse, RepoResponse
from app.services.auth_service import decrypt_token

logger = structlog.get_logger(__name__)
settings = get_settings()


def _gh_client(user: User) -> AsyncGitHubClient:
    token = decrypt_token(user.access_token_encrypted)
    return AsyncGitHubClient(token)


async def list_repos(db: AsyncSession, user: User) -> list[GitHubRepoItem]:
    """List repos from GitHub, annotated with connection status from DB."""
    client = _gh_client(user)
    gh_repos = await client.list_user_repos()

    connected = await repo_repo.list_connected(db, user.id)
    connected_map = {r.github_repo_id: r for r in connected}

    items: list[GitHubRepoItem] = []
    for r in gh_repos:
        db_repo = connected_map.get(r["id"])
        items.append(
            GitHubRepoItem(
                github_repo_id=r["id"],
                full_name=r["full_name"],
                private=r["private"],
                description=r.get("description"),
                updated_at=r.get("updated_at"),
                open_issues_count=r.get("open_issues_count", 0),
                is_connected=db_repo is not None,
                db_id=db_repo.id if db_repo else None,
            )
        )
    return items


async def connect_repo(db: AsyncSession, user: User, github_repo_id: int) -> ConnectResponse:
    client = _gh_client(user)

    # Find repo in GitHub listing to get full_name
    gh_repos = await client.list_user_repos()
    gh_repo = next((r for r in gh_repos if r["id"] == github_repo_id), None)
    if not gh_repo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found in your GitHub account")

    owner, name = gh_repo["full_name"].split("/", 1)
    webhook_secret = AsyncGitHubClient.generate_webhook_secret()
    webhook_url = f"{settings.WEBHOOK_BASE_URL}/webhooks/github"

    from app.services.auth_service import encrypt_token
    hook_data = await client.register_webhook(owner, name, webhook_url, webhook_secret)

    # Upsert repo row
    repo = await repo_repo.upsert(db, user.id, github_repo_id, gh_repo["full_name"])
    encrypted_secret = encrypt_token(webhook_secret)
    await repo_repo.mark_connected(db, repo, hook_data["id"], encrypted_secret.encode() if isinstance(encrypted_secret, str) else encrypted_secret)

    logger.info("repo_connected", full_name=gh_repo["full_name"], webhook_id=hook_data["id"])
    return ConnectResponse(message="Repository connected", repo=RepoResponse.model_validate(repo))


async def disconnect_repo(db: AsyncSession, user: User, repo_db_id: uuid.UUID) -> DisconnectResponse:
    repo = await repo_repo.get_by_id(db, repo_db_id)
    if not repo or repo.user_id != user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found")

    if repo.webhook_id:
        owner, name = repo.full_name.split("/", 1)
        client = _gh_client(user)
        try:
            await client.delete_webhook(owner, name, repo.webhook_id)
        except Exception as e:
            logger.warning("webhook_delete_failed", error=str(e), full_name=repo.full_name)

    await repo_repo.mark_disconnected(db, repo)
    logger.info("repo_disconnected", full_name=repo.full_name)
    return DisconnectResponse(message="Repository disconnected")


async def get_repo_detail(db: AsyncSession, user: User, repo_db_id: uuid.UUID) -> RepoDetailResponse:
    from app.repositories import pr_repo, review_repo
    from sqlalchemy import select, func
    from app.models.pull_request import PullRequest
    from app.models.review import Review
    from app.models.review_comment import ReviewComment

    repo = await repo_repo.get_by_id(db, repo_db_id)
    if not repo or repo.user_id != user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found")

    prs = await pr_repo.list_by_repo(db, repo_db_id)
    open_prs = [p for p in prs if p.status not in ("completed", "failed")]
    reviewed = [p for p in prs if p.status == "completed"]

    # Count total issues across all reviews
    total_issues = 0
    for pr in prs:
        review = await review_repo.get_by_pr_id(db, pr.id)
        if review and review.comments:
            total_issues += len(review.comments)

    return RepoDetailResponse(
        id=repo.id,
        github_repo_id=repo.github_repo_id,
        full_name=repo.full_name,
        is_connected=repo.is_connected,
        connected_at=repo.connected_at,
        total_prs=len(prs),
        open_prs=len(open_prs),
        reviewed_prs=len(reviewed),
        total_issues=total_issues,
    )
