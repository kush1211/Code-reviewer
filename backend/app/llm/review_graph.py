from __future__ import annotations

"""
3-node LangGraph review pipeline:
  analyze → review → reflect

- analyze: diff-only, cheap call — understands intent + risk areas
- review:  full context call, guided by the analysis
- reflect: self-correction pass — removes false positives, calibrates severity

The LLM is configured via settings.LLM_MODEL (e.g. "anthropic:claude-sonnet-4-5"
or "openai:gpt-4o") using LangChain's init_chat_model — fully provider-agnostic.
"""

import json
import re
from typing import Any

import structlog
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from app.config import get_settings
from app.schemas.review import LLMReviewResponse

logger = structlog.get_logger(__name__)
settings = get_settings()

MAX_TOKENS = 4096
TOKEN_BUDGET = 150_000  # rough estimate: chars // 4 ≈ tokens

# ─── Prompts ──────────────────────────────────────────────────────────────────

ANALYZE_SYSTEM = """\
You are a staff software engineer performing pre-analysis of a GitHub pull request.

Your goal: understand what this PR is trying to do BEFORE reviewing it in detail.

Given only the unified diff (no full file contents), produce a concise JSON analysis:

{
  "intent": "<1-2 sentences: what is this PR trying to accomplish?>",
  "risk_areas": ["<area of concern>", ...],
  "focus_files": ["<file path>", ...]
}

- risk_areas: up to 5 areas of potential concern (e.g. "auth bypass", "N+1 query", "missing validation")
- focus_files: the 5-10 files that deserve the most scrutiny
- Return ONLY the JSON object — no prose, no markdown fences.
"""

REVIEW_SYSTEM = """\
You are a senior software engineer performing a thorough code review of a GitHub pull request.

You have been given: the PR description, the unified diff, full changed file contents,
and optionally 1-level-deep imported context files.

A prior analysis has already identified the PR intent and high-risk areas — use it to
focus your review on what matters most.

Return ONLY valid JSON — no prose, no markdown fences, no text outside the JSON object:

{
  "verdict": "approved" | "changes_requested" | "commented",
  "summary": "<markdown, 2-4 paragraphs covering: what the PR does, key issues, what looks good>",
  "comments": [
    {
      "file": "<file path>",
      "line": <line number as integer, or 1 if not pinpointable>,
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

REFLECT_SYSTEM = """\
You are a principal engineer reviewing an AI-generated code review for quality and accuracy.

Given the original unified diff and an AI-generated review JSON, check for:
1. False positives — issues flagged that don't actually exist in the code
2. Severity miscalibration — real criticals hidden as nitpicks, or vice versa
3. Duplicate comments about the same underlying issue (merge them)
4. Gaps in the identified risk areas that were missed

Make corrections where needed and return the improved review with the same JSON schema:

{
  "verdict": "approved" | "changes_requested" | "commented",
  "summary": "<markdown, 2-4 paragraphs>",
  "comments": [...]
}

Return ONLY the JSON object. If the review is already accurate, return it unchanged.
"""


# ─── Graph state ──────────────────────────────────────────────────────────────

class ReviewState(TypedDict):
    # inputs
    pr_title: str
    pr_body: str
    diff: str
    changed_files: dict[str, str]
    import_files: dict[str, str]
    # intermediate
    analysis: dict[str, Any]
    raw_review: dict[str, Any]
    # output
    final_review: dict[str, Any]


# ─── Token budget ─────────────────────────────────────────────────────────────

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
        # Truncate changed files from the tail to fit
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
        # Drop all import files to fit
        return changed_files, {}

    return changed_files, import_files


# ─── Message builders ─────────────────────────────────────────────────────────

def _build_analyze_message(pr_title: str, pr_body: str, diff: str) -> str:
    return "\n".join([
        f"## PR: {pr_title}",
        "",
        pr_body or "(no description)",
        "",
        "---",
        "## Unified diff",
        "```diff",
        diff[:40_000],  # only need the diff for analysis
        "```",
    ])


def _build_review_message(
    pr_title: str,
    pr_body: str,
    diff: str,
    changed_files: dict[str, str],
    import_files: dict[str, str],
    analysis: dict[str, Any],
) -> str:
    lines: list[str] = [
        f"## PR: {pr_title}",
        "",
        pr_body or "(no description)",
        "",
        "---",
        "## Prior Analysis (from pre-scan)",
        f"**Intent:** {analysis.get('intent', 'N/A')}",
        f"**Risk areas:** {', '.join(analysis.get('risk_areas', []))}",
        f"**Focus files:** {', '.join(analysis.get('focus_files', []))}",
        "",
        "---",
        "## Unified diff",
        "```diff",
        diff[:40_000],
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


def _build_reflect_message(
    diff: str,
    raw_review: dict[str, Any],
    analysis: dict[str, Any],
) -> str:
    return "\n".join([
        "## Original PR diff (first 20 000 chars)",
        "```diff",
        diff[:20_000],
        "```",
        "",
        "---",
        f"## Identified risk areas: {', '.join(analysis.get('risk_areas', []))}",
        "",
        "---",
        "## AI-generated review to validate",
        "```json",
        json.dumps(raw_review, indent=2),
        "```",
    ])


# ─── JSON parse helper ────────────────────────────────────────────────────────

def _parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    # Strip accidental markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text.strip())
    return json.loads(text)


# ─── LLM factory ──────────────────────────────────────────────────────────────

def _make_llm() -> Any:
    """
    Build a LangChain chat model from settings.LLM_MODEL.

    Format: "<provider>:<model>" — e.g. "anthropic:claude-sonnet-4-5"
    or just "<model>" for the default provider.
    API keys are read automatically from environment variables
    (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.).
    """
    return init_chat_model(settings.LLM_MODEL, max_tokens=MAX_TOKENS)


# ─── Graph nodes ──────────────────────────────────────────────────────────────

async def _analyze_node(state: ReviewState) -> dict[str, Any]:
    """Node 1 — diff-only, lightweight call to understand intent and risk."""
    llm = _make_llm()
    user_msg = _build_analyze_message(state["pr_title"], state["pr_body"], state["diff"])

    logger.info("graph_analyze_start", model=settings.LLM_MODEL, diff_chars=len(state["diff"]))

    response = await llm.ainvoke([
        SystemMessage(content=ANALYZE_SYSTEM),
        HumanMessage(content=user_msg),
    ])

    analysis = _parse_json(response.content)
    logger.info(
        "graph_analyze_done",
        intent=str(analysis.get("intent", ""))[:100],
        risk_areas=analysis.get("risk_areas", []),
    )
    return {"analysis": analysis}


async def _review_node(state: ReviewState) -> dict[str, Any]:
    """Node 2 — full-context review, guided by the prior analysis."""
    llm = _make_llm()
    user_msg = _build_review_message(
        state["pr_title"],
        state["pr_body"],
        state["diff"],
        state["changed_files"],
        state["import_files"],
        state["analysis"],
    )

    logger.info(
        "graph_review_start",
        model=settings.LLM_MODEL,
        estimated_tokens=_estimate_tokens(user_msg),
    )

    response = await llm.ainvoke([
        SystemMessage(content=REVIEW_SYSTEM),
        HumanMessage(content=user_msg),
    ])

    raw_review = _parse_json(response.content)
    logger.info(
        "graph_review_done",
        verdict=raw_review.get("verdict"),
        n_comments=len(raw_review.get("comments", [])),
    )
    return {"raw_review": raw_review}


async def _reflect_node(state: ReviewState) -> dict[str, Any]:
    """Node 3 — self-correction pass: removes false positives, calibrates severity."""
    llm = _make_llm()
    user_msg = _build_reflect_message(state["diff"], state["raw_review"], state["analysis"])

    logger.info("graph_reflect_start", model=settings.LLM_MODEL)

    response = await llm.ainvoke([
        SystemMessage(content=REFLECT_SYSTEM),
        HumanMessage(content=user_msg),
    ])

    final_review = _parse_json(response.content)
    logger.info(
        "graph_reflect_done",
        verdict=final_review.get("verdict"),
        n_comments=len(final_review.get("comments", [])),
    )
    return {"final_review": final_review}


# ─── Graph construction ───────────────────────────────────────────────────────

def _build_graph():
    return (
        StateGraph(ReviewState)
        .add_node("analyze", _analyze_node)
        .add_node("review", _review_node)
        .add_node("reflect", _reflect_node)
        .add_edge(START, "analyze")
        .add_edge("analyze", "review")
        .add_edge("review", "reflect")
        .add_edge("reflect", END)
        .compile()
    )


# Singleton — compiled once, reused across calls in the same process
_graph = None


def _get_graph():
    global _graph
    if _graph is None:
        _graph = _build_graph()
    return _graph


# ─── Public API ───────────────────────────────────────────────────────────────

async def get_review(
    pr_title: str,
    pr_body: str,
    diff: str,
    changed_files: dict[str, str],
    import_files: dict[str, str],
) -> tuple[LLMReviewResponse, dict[str, Any]]:
    """
    Run the 3-node LangGraph review pipeline.

    Returns (validated_response, raw_final_dict).
    The raw dict is stored as-is in the DB (raw_llm_response column).
    """
    changed_files, import_files = apply_token_budget(diff, changed_files, import_files)

    graph = _get_graph()
    result = await graph.ainvoke({
        "pr_title": pr_title,
        "pr_body": pr_body,
        "diff": diff,
        "changed_files": changed_files,
        "import_files": import_files,
        "analysis": {},
        "raw_review": {},
        "final_review": {},
    })

    final = result["final_review"]
    validated = LLMReviewResponse.model_validate(final)
    return validated, final
