from __future__ import annotations

import os
import re
from typing import Protocol, runtime_checkable


@runtime_checkable
class ImportParser(Protocol):
    def parse(self, content: str, file_path: str) -> list[str]:
        """Return relative file paths imported by this file (1-level, relative only)."""
        ...


class PythonImportParser:
    """Extracts relative imports from Python files using regex."""

    # Matches: from .foo import bar  /  from ..foo.bar import baz
    _RE = re.compile(r"^\s*from\s+(\.[\w.]*)\s+import", re.MULTILINE)

    def parse(self, content: str, file_path: str) -> list[str]:
        base_dir = os.path.dirname(file_path)
        results: list[str] = []
        for match in self._RE.finditer(content):
            rel = match.group(1)
            # Convert relative module path → file path
            parts = rel.lstrip(".")
            dots = len(rel) - len(parts)
            # Walk up `dots - 1` directories from base_dir
            up = max(dots - 1, 0)
            resolved_dir = base_dir
            for _ in range(up):
                resolved_dir = os.path.dirname(resolved_dir)
            module_path = parts.replace(".", "/") if parts else ""
            if module_path:
                candidate = os.path.join(resolved_dir, module_path + ".py").replace("\\", "/")
                results.append(candidate)
        return results


class JSImportParser:
    """Extracts relative imports from JS/TS files using regex."""

    # Matches: import ... from './foo'  or  import ... from "../bar/baz"
    _RE = re.compile(r"""import\s+.*?from\s+['"](\.[^'"]+)['"]""", re.MULTILINE | re.DOTALL)
    # Also handle: require('./foo')
    _RE_REQUIRE = re.compile(r"""require\s*\(\s*['"](\.[^'"]+)['"]\s*\)""")

    def parse(self, content: str, file_path: str) -> list[str]:
        base_dir = os.path.dirname(file_path)
        candidates: list[str] = []
        for match in self._RE.finditer(content):
            candidates.append(match.group(1))
        for match in self._RE_REQUIRE.finditer(content):
            candidates.append(match.group(1))

        results: list[str] = []
        for rel in candidates:
            resolved = os.path.normpath(os.path.join(base_dir, rel)).replace("\\", "/")
            # Try common extensions
            for ext in ("", ".ts", ".tsx", ".js", ".jsx"):
                results.append(resolved + ext)
        return results


_PARSERS: dict[str, ImportParser] = {
    ".py": PythonImportParser(),
    ".js": JSImportParser(),
    ".jsx": JSImportParser(),
    ".ts": JSImportParser(),
    ".tsx": JSImportParser(),
}


def get_parser(file_path: str) -> ImportParser | None:
    ext = os.path.splitext(file_path)[1].lower()
    return _PARSERS.get(ext)


# Files to skip entirely during review
SKIP_PATTERNS: list[re.Pattern] = [
    re.compile(r"package-lock\.json$"),
    re.compile(r"yarn\.lock$"),
    re.compile(r"\.lock$"),
    re.compile(r"pnpm-lock\.yaml$"),
    re.compile(r"\.min\.(js|css)$"),
    re.compile(r"\.generated\."),
    re.compile(r"_pb2\.py$"),
    re.compile(r"\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|mp3|pdf)$"),
    re.compile(r"__pycache__"),
    re.compile(r"\.pyc$"),
]

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
    ".ttf", ".eot", ".mp4", ".mp3", ".pdf", ".zip", ".tar", ".gz",
    ".exe", ".dll", ".so", ".dylib",
}


def should_skip(file_path: str) -> bool:
    ext = os.path.splitext(file_path)[1].lower()
    if ext in BINARY_EXTENSIONS:
        return True
    for pattern in SKIP_PATTERNS:
        if pattern.search(file_path):
            return True
    return False
