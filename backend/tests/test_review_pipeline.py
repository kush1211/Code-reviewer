"""Tests for the review pipeline: import parser, token budget, LLM response parsing."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.github.import_parser import (
    JSImportParser,
    PythonImportParser,
    get_parser,
    should_skip,
)
from app.llm.review_graph import apply_token_budget
from app.schemas.review import LLMReviewResponse


# ─── Import parser tests ──────────────────────────────────────────────────────

class TestPythonImportParser:
    def test_relative_import(self):
        parser = PythonImportParser()
        content = "from .utils import helper\nfrom .models.user import User"
        results = parser.parse(content, "app/services/auth.py")
        assert any("utils.py" in r for r in results)

    def test_absolute_import_skipped(self):
        parser = PythonImportParser()
        content = "import os\nfrom pathlib import Path\nimport requests"
        results = parser.parse(content, "app/main.py")
        assert results == []

    def test_deep_relative_import(self):
        parser = PythonImportParser()
        content = "from ..config import settings"
        results = parser.parse(content, "app/services/auth.py")
        assert len(results) > 0


class TestJSImportParser:
    def test_relative_import(self):
        parser = JSImportParser()
        content = "import { foo } from './utils';\nimport Bar from '../components/Bar';"
        results = parser.parse(content, "src/pages/index.ts")
        assert any("utils" in r for r in results)
        assert any("Bar" in r for r in results)

    def test_absolute_import_skipped(self):
        parser = JSImportParser()
        content = "import React from 'react';\nimport { useState } from 'react';"
        results = parser.parse(content, "src/app.tsx")
        assert results == []

    def test_require_syntax(self):
        parser = JSImportParser()
        content = "const foo = require('./foo');"
        results = parser.parse(content, "src/index.js")
        assert any("foo" in r for r in results)


class TestGetParser:
    def test_python_file(self):
        assert get_parser("app/main.py") is not None

    def test_ts_file(self):
        assert get_parser("src/index.ts") is not None

    def test_unknown_extension(self):
        assert get_parser("README.md") is None

    def test_go_file_no_parser(self):
        assert get_parser("main.go") is None


class TestShouldSkip:
    def test_skip_lockfile(self):
        assert should_skip("package-lock.json") is True
        assert should_skip("yarn.lock") is True
        assert should_skip("Pipfile.lock") is True

    def test_skip_minified(self):
        assert should_skip("dist/bundle.min.js") is True

    def test_skip_binary(self):
        assert should_skip("assets/logo.png") is True
        assert should_skip("fonts/Inter.woff2") is True

    def test_allow_source_file(self):
        assert should_skip("src/main.py") is False
        assert should_skip("app/models/user.ts") is False


# ─── Token budget tests ───────────────────────────────────────────────────────

class TestTokenBudget:
    def test_small_context_unchanged(self):
        diff = "small diff"
        changed = {"file.py": "short content"}
        imports = {"dep.py": "dep content"}
        out_changed, out_imports = apply_token_budget(diff, changed, imports)
        assert out_changed == changed
        assert out_imports == imports

    def test_large_import_dropped(self):
        diff = "d" * 100
        changed = {"f.py": "c" * 100}
        # Import is massive
        imports = {"dep.py": "x" * (150_000 * 4 + 1)}
        _, out_imports = apply_token_budget(diff, changed, imports)
        assert out_imports == {}

    def test_huge_changed_file_truncated(self):
        # Exceed budget with changed files
        diff = ""
        big_content = "a" * (150_000 * 4 + 10_000)
        changed = {"huge.py": big_content}
        out_changed, _ = apply_token_budget(diff, changed, {})
        assert len(out_changed.get("huge.py", "")) <= 150_000 * 4


# ─── LLM response schema tests ───────────────────────────────────────────────

class TestLLMReviewResponse:
    def test_valid_response(self):
        raw = {
            "verdict": "changes_requested",
            "summary": "Good PR but has issues.",
            "comments": [
                {
                    "file": "src/main.py",
                    "line": 42,
                    "severity": "critical",
                    "comment": "Missing error handling",
                    "suggestion": "try:\n    ...\nexcept Exception as e:\n    log(e)",
                }
            ],
        }
        result = LLMReviewResponse.model_validate(raw)
        assert result.verdict == "changes_requested"
        assert len(result.comments) == 1
        assert result.comments[0].severity == "critical"

    def test_empty_comments(self):
        raw = {"verdict": "approved", "summary": "Looks great!", "comments": []}
        result = LLMReviewResponse.model_validate(raw)
        assert result.verdict == "approved"
        assert result.comments == []

    def test_invalid_verdict_raises(self):
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            LLMReviewResponse.model_validate({"verdict": "bad", "summary": "x", "comments": []})

    def test_invalid_severity_raises(self):
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            LLMReviewResponse.model_validate({
                "verdict": "approved",
                "summary": "ok",
                "comments": [{"file": "f.py", "line": 1, "severity": "BLOCKER", "comment": "x"}],
            })


# ─── LangGraph pipeline tests ─────────────────────────────────────────────────

VALID_ANALYSIS = {
    "intent": "Add error handling to the auth service",
    "risk_areas": ["auth bypass", "missing validation"],
    "focus_files": ["app/services/auth.py"],
}

VALID_REVIEW = {
    "verdict": "changes_requested",
    "summary": "The PR adds error handling but misses a critical edge case.",
    "comments": [
        {
            "file": "app/services/auth.py",
            "line": 42,
            "severity": "warning",
            "comment": "Token expiry not checked",
            "suggestion": None,
        }
    ],
}


class TestReviewGraph:
    """Tests for the 3-node LangGraph pipeline using mocked LLM calls."""

    @pytest.mark.asyncio
    async def test_get_review_happy_path(self):
        """Full pipeline with all 3 nodes returning valid JSON."""
        from app.llm.review_graph import get_review

        # Node responses in order: analyze → review → reflect
        analyze_resp = MagicMock()
        analyze_resp.content = json.dumps(VALID_ANALYSIS)

        review_resp = MagicMock()
        review_resp.content = json.dumps(VALID_REVIEW)

        reflect_resp = MagicMock()
        reflect_resp.content = json.dumps(VALID_REVIEW)  # unchanged after reflection

        call_count = 0

        async def fake_ainvoke(messages, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return analyze_resp
            elif call_count == 2:
                return review_resp
            else:
                return reflect_resp

        mock_llm = MagicMock()
        mock_llm.ainvoke = fake_ainvoke

        with patch("app.llm.review_graph._make_llm", return_value=mock_llm):
            # Force graph rebuild so mock takes effect
            import app.llm.review_graph as rg
            rg._graph = None

            result, raw = await get_review(
                pr_title="Fix auth",
                pr_body="Adds token validation",
                diff="--- a/auth.py\n+++ b/auth.py\n@@ -1 +1 @@\n+check()",
                changed_files={"app/services/auth.py": "def check(): pass"},
                import_files={},
            )

        assert result.verdict == "changes_requested"
        assert len(result.comments) == 1
        assert result.comments[0].severity == "warning"
        assert call_count == 3  # all 3 nodes fired

    @pytest.mark.asyncio
    async def test_token_budget_applied_before_graph(self):
        """apply_token_budget should strip oversized imports before the graph runs."""
        from app.llm.review_graph import apply_token_budget

        diff = "d" * 100
        changed = {"f.py": "c" * 100}
        huge_imports = {"dep.py": "x" * (150_000 * 4 + 1)}

        out_changed, out_imports = apply_token_budget(diff, changed, huge_imports)
        assert out_imports == {}
        assert out_changed == changed

    def test_build_analyze_message_includes_diff(self):
        from app.llm.review_graph import _build_analyze_message
        msg = _build_analyze_message("My PR", "Fixes bug", "--- a/f.py\n+++ b/f.py")
        assert "My PR" in msg
        assert "--- a/f.py" in msg
        assert "Fixes bug" in msg

    def test_build_review_message_includes_analysis(self):
        from app.llm.review_graph import _build_review_message
        msg = _build_review_message(
            "My PR", "body", "diff text",
            {"file.py": "content"},
            {},
            VALID_ANALYSIS,
        )
        assert "Prior Analysis" in msg
        assert "auth bypass" in msg
        assert "app/services/auth.py" in msg

    def test_build_reflect_message_includes_raw_review(self):
        from app.llm.review_graph import _build_reflect_message
        msg = _build_reflect_message("diff text", VALID_REVIEW, VALID_ANALYSIS)
        assert "changes_requested" in msg
        assert "risk areas" in msg.lower()

    def test_parse_json_strips_fences(self):
        from app.llm.review_graph import _parse_json
        raw = "```json\n{\"key\": \"value\"}\n```"
        result = _parse_json(raw)
        assert result == {"key": "value"}

    def test_parse_json_plain(self):
        from app.llm.review_graph import _parse_json
        result = _parse_json('{"verdict": "approved"}')
        assert result["verdict"] == "approved"
