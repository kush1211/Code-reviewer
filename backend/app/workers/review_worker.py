from __future__ import annotations

"""
RQ background worker — runs the full review pipeline.

This module uses *synchronous* SQLAlchemy because RQ workers run in
a plain synchronous process. We use asyncio.run() to drive async
GitHub + LLM calls from the sync entry point.
"""

import asyncio
import traceback
import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.github.client import AsyncGitHubClient
from app.github.import_parser import get_parser, should_skip
from app.llm.review_graph import get_review
from app.models import PullRequest, Repo, Review, ReviewComment, User
from app.services.auth_service import decrypt_token

logger = structlog.get_logger(__name__)
settings = get_settings()

# Sync engine for the worker process
_sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2", 1)
_engine = create_engine(_sync_url, pool_pre_ping=True, pool_size=5)

MAX_IMPORT_FILES = 30


def _sync_session() -> Session:
    return Session(_engine)


# ─── Main entry point (called by RQ) ─────────────────────────────────────────

def run_review(repo_id: str, pr_number: int) -> None:
    log = logger.bind(repo_id=repo_id, pr_number=pr_number)
    log.info("review_started")

    with _sync_session() as db:
        repo = db.get(Repo, uuid.UUID(repo_id))
        if not repo:
            log.error("repo_not_found")
            return

        user = db.get(User, repo.user_id)
        if not user:
            log.error("user_not_found")
            return

        # Upsert PR row + review row
        pr = (
            db.execute(
                select(PullRequest).where(
                    PullRequest.repo_id == repo.id,
                    PullRequest.github_pr_number == pr_number,
                )
            )
            .scalar_one_or_none()
        )
        if not pr:
            # Will be populated after fetching from GitHub
            pr = PullRequest(
                repo_id=repo.id,
                github_pr_number=pr_number,
                title="",
                author="",
                head_sha="",
                base_sha="",
                status="reviewing",
            )
            db.add(pr)
            db.flush()

        # Upsert review
        review = db.execute(
            select(Review).where(Review.pr_id == pr.id)
        ).scalar_one_or_none()
        if not review:
            review = Review(pr_id=pr.id, status="reviewing", started_at=datetime.now(timezone.utc))
            db.add(review)
        else:
            review.status = "reviewing"
            review.started_at = datetime.now(timezone.utc)
            review.completed_at = None
            review.verdict = None
            review.summary_markdown = None
            # Delete old comments (idempotent)
            db.execute(
                ReviewComment.__table__.delete().where(ReviewComment.review_id == review.id)
            )
        db.commit()

        try:
            asyncio.run(_async_pipeline(db, repo, user, pr, review, pr_number, log))
        except Exception:
            log.exception("review_pipeline_failed")
            review.status = "failed"
            review.completed_at = datetime.now(timezone.utc)
            pr.status = "failed"
            db.commit()


# ─── Async pipeline (GitHub API + LLM calls) ─────────────────────────────────

async def _async_pipeline(
    db: Session,
    repo: Repo,
    user: User,
    pr: PullRequest,
    review: Review,
    pr_number: int,
    log: structlog.BoundLogger,
) -> None:
    token = decrypt_token(user.access_token_encrypted)
    client = AsyncGitHubClient(token)

    owner, repo_name = repo.full_name.split("/", 1)

    # 1. Fetch PR metadata
    gh_pr = await client.get_pr(owner, repo_name, pr_number)
    pr.title = gh_pr.get("title", "")
    pr.author = gh_pr.get("user", {}).get("login", "")
    pr.head_sha = gh_pr.get("head", {}).get("sha", "")
    pr.base_sha = gh_pr.get("base", {}).get("sha", "")
    pr.status = "reviewing"
    db.flush()

    pr_body = gh_pr.get("body") or ""

    # 2. Fetch file list
    gh_files = await client.get_pr_files(owner, repo_name, pr_number)
    changed_paths = [f["filename"] for f in gh_files if not should_skip(f["filename"])]
    log.info("files_fetched", total=len(gh_files), filtered=len(changed_paths))

    # 3. Fetch unified diff
    diff = await client.get_pr_diff(owner, repo_name, pr_number)

    # 4. Fetch full content of changed files
    changed_files: dict[str, str] = {}
    for path in changed_paths:
        content = await client.get_file_content(owner, repo_name, path, pr.head_sha)
        if content:
            changed_files[path] = content

    # 5. Parse imports and fetch (1-level deep, dedup, cap at MAX_IMPORT_FILES)
    import_paths: set[str] = set()
    for path, content in changed_files.items():
        parser = get_parser(path)
        if parser:
            for imp_path in parser.parse(content, path):
                if imp_path not in changed_files and not should_skip(imp_path):
                    import_paths.add(imp_path)
                if len(import_paths) >= MAX_IMPORT_FILES:
                    break

    import_files: dict[str, str] = {}
    for imp_path in list(import_paths)[:MAX_IMPORT_FILES]:
        content = await client.get_file_content(owner, repo_name, imp_path, pr.head_sha)
        if content:
            import_files[imp_path] = content

    log.info("context_built", changed=len(changed_files), imports=len(import_files))

    # 6. Call Claude
    llm_result, raw_dict = await get_review(
        pr_title=pr.title,
        pr_body=pr_body,
        diff=diff,
        changed_files=changed_files,
        import_files=import_files,
    )

    log.info("llm_complete", verdict=llm_result.verdict, comments=len(llm_result.comments))

    # 7. Persist review + comments
    review.status = "completed"
    review.verdict = llm_result.verdict
    review.summary_markdown = llm_result.summary
    review.raw_llm_response = raw_dict
    review.completed_at = datetime.now(timezone.utc)

    for c in llm_result.comments:
        comment = ReviewComment(
            review_id=review.id,
            file_path=c.file,
            line_number=c.line,
            severity=c.severity,
            comment=c.comment,
            suggestion_code=c.suggestion,
        )
        db.add(comment)

    pr.status = "completed"
    db.commit()

    # 8. Post summary comment to GitHub
    await _post_github_comment(client, owner, repo_name, pr_number, llm_result)
    log.info("review_complete")


async def _post_github_comment(
    client: AsyncGitHubClient,
    owner: str,
    repo: str,
    pr_number: int,
    result,
) -> None:
    verdict_emoji = {
        "approved": "✅",
        "changes_requested": "🔴",
        "commented": "💬",
    }.get(result.verdict, "🤖")

    verdict_label = result.verdict.replace("_", " ").title()

    critical = [c for c in result.comments if c.severity == "critical"]
    warning = [c for c in result.comments if c.severity == "warning"]
    suggestion = [c for c in result.comments if c.severity == "suggestion"]
    nitpick = [c for c in result.comments if c.severity == "nitpick"]

    counts = []
    if critical:  counts.append(f"🔴 {len(critical)} critical")
    if warning:   counts.append(f"🟡 {len(warning)} warning")
    if suggestion: counts.append(f"🔵 {len(suggestion)} suggestion")
    if nitpick:   counts.append(f"⚪ {len(nitpick)} nitpick")

    body_lines = [
        f"## {verdict_emoji} Reviewly — {verdict_label}",
        "",
        result.summary,
        "",
    ]

    if counts:
        body_lines += ["**Issues:** " + " · ".join(counts), ""]

    if result.comments:
        body_lines += ["### Top findings", ""]
        for c in result.comments[:5]:
            sev_label = {"critical": "🔴", "warning": "🟡", "suggestion": "🔵", "nitpick": "⚪"}.get(c.severity, "•")
            body_lines.append(f"- {sev_label} **{c.file}:{c.line}** — {c.comment}")
        body_lines.append("")

    body_lines += ["---", "*Posted by [Reviewly](https://github.com) · AI-powered PR reviews*"]

    comment_body = "\n".join(body_lines)
    await client.create_pr_comment(owner, repo, pr_number, comment_body)
