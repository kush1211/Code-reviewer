from __future__ import annotations

import json
import re

import anthropic
import structlog

from app.config import get_settings
from app.schemas.review import LLMReviewResponse

logger = structlog.get_logger(__name__)

settings = get_settings()

MODEL = "claude-sonnet-4-5"
MAX_TOKENS = 4096
TOKEN_BUDGET = 150_000  # rough char estimate: chars // 4 ≈ tokens

SYSTEM_PROMPT = """\
You are a senior software engineer performing a thorough code review of a GitHub pull request.

Analyze the provided diff, changed files, and any imported context files. Identify real issues.

Return ONLY valid JSON — no prose, no markdown fences, no text outside the JSON object:

{
  "verdict": "approved" | "changes_requested" | "commented",
  "summary": "<markdown, 2-4 paragraphs covering: what the PR does, key issues, what looks good>",
  "comments": [
    {
      "file": "<file path>",
      "line": <line number as integer>,
      "severity": "critical" | "warning" | "suggestion" | "nitpick",
      "comment": "<clear explanation of the issue>",
      "suggestion": "<optional: exact replacement code>"
    }
  ]
}

severity guide:
- critical: merge-blocking bug, security hole, data loss risk
- warning: incorrect behavior under edge cases, performance cliff
- suggestion: better approach, missing test coverage, design improvement
- nitpick: style, naming, minor consistency
"""


def _build_user_message(
    pr_title: str,
    pr_body: str,
    diff: str,
    changed_files: dict[str, str],
    import_files: dict[str, str],
) -> str:
    lines: list[str] = [
        f"## PR: {pr_title}",
        "",
        f"{pr_body or '(no description)'}",
        "",
        "---",
        "## Unified diff",
        "```diff",
        diff[:40_000],  # cap diff at 40k chars
        "```",
        "",
        "---",
        "## Changed files (full content)",
    ]
    for path, content in changed_files.items():
        lines += [f"\n### {path}\n```\n{content}\n```"]

    if import_files:
        lines += ["", "---", "## Imported context (1-level, read-only)"]
        for path, content in import_files.items():
            lines += [f"\n### {path}\n```\n{content}\n```"]

    return "\n".join(lines)


def _estimate_tokens(text: str) -> int:
    return len(text) // 4


def apply_token_budget(
    diff: str,
    changed_files: dict[str, str],
    import_files: dict[str, str],
) -> tuple[dict[str, str], dict[str, str]]:
    """Drop or truncate content to stay within TOKEN_BUDGET."""
    base_chars = len(diff) + sum(len(v) for v in changed_files.values())
    budget_chars = TOKEN_BUDGET * 4

    if base_chars > budget_chars:
        # Truncate changed files from the tail
        remaining = budget_chars
        trimmed: dict[str, str] = {}
        for path, content in changed_files.items():
            take = min(len(content), remaining)
            trimmed[path] = content[:take]
            remaining -= take
            if remaining <= 0:
                break
        return trimmed, {}

    import_budget = budget_chars - base_chars
    if sum(len(v) for v in import_files.values()) > import_budget:
        # Drop import files to fit
        return changed_files, {}

    return changed_files, import_files


async def get_review(
    pr_title: str,
    pr_body: str,
    diff: str,
    changed_files: dict[str, str],
    import_files: dict[str, str],
) -> LLMReviewResponse:
    changed_files, import_files = apply_token_budget(diff, changed_files, import_files)

    user_message = _build_user_message(pr_title, pr_body, diff, changed_files, import_files)

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    logger.info("calling_claude", model=MODEL, estimated_tokens=_estimate_tokens(user_message))

    response = await client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_text = response.content[0].text.strip()

    # Strip markdown fences if Claude accidentally included them
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text.strip())

    raw_dict = json.loads(raw_text)
    return LLMReviewResponse.model_validate(raw_dict), raw_dict
