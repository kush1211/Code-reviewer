from __future__ import annotations

import secrets
import structlog
import httpx
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

logger = structlog.get_logger(__name__)

GITHUB_API = "https://api.github.com"
GITHUB_ACCEPT = "application/vnd.github+json"


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (429, 500, 502, 503, 504)
    return isinstance(exc, (httpx.TimeoutException, httpx.NetworkError))


def _retry_decorator():
    return retry(
        retry=retry_if_exception(_is_retryable),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        stop=stop_after_attempt(4),
        reraise=True,
    )


class AsyncGitHubClient:
    def __init__(self, token: str) -> None:
        self._token = token
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Accept": GITHUB_ACCEPT,
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=GITHUB_API,
            headers=self._headers,
            timeout=30.0,
        )

    @_retry_decorator()
    async def list_user_repos(self, per_page: int = 100) -> list[dict]:
        repos: list[dict] = []
        page = 1
        async with self._client() as client:
            while True:
                r = await client.get(
                    "/user/repos",
                    params={"per_page": per_page, "page": page, "sort": "updated"},
                )
                r.raise_for_status()
                batch = r.json()
                if not batch:
                    break
                repos.extend(batch)
                page += 1
        return repos

    @_retry_decorator()
    async def get_pr(self, owner: str, repo: str, number: int) -> dict:
        async with self._client() as client:
            r = await client.get(f"/repos/{owner}/{repo}/pulls/{number}")
            r.raise_for_status()
            return r.json()

    @_retry_decorator()
    async def get_pr_files(self, owner: str, repo: str, number: int) -> list[dict]:
        async with self._client() as client:
            r = await client.get(f"/repos/{owner}/{repo}/pulls/{number}/files", params={"per_page": 100})
            r.raise_for_status()
            return r.json()

    @_retry_decorator()
    async def get_pr_diff(self, owner: str, repo: str, number: int) -> str:
        headers = {**self._headers, "Accept": "application/vnd.github.v3.diff"}
        async with httpx.AsyncClient(base_url=GITHUB_API, headers=headers, timeout=30.0) as client:
            r = await client.get(f"/repos/{owner}/{repo}/pulls/{number}")
            r.raise_for_status()
            return r.text

    @_retry_decorator()
    async def get_file_content(self, owner: str, repo: str, path: str, ref: str) -> str:
        """Fetch raw file content at a specific ref/sha."""
        import base64
        async with self._client() as client:
            r = await client.get(
                f"/repos/{owner}/{repo}/contents/{path}",
                params={"ref": ref},
            )
            if r.status_code == 404:
                return ""
            r.raise_for_status()
            data = r.json()
            if isinstance(data, dict) and data.get("encoding") == "base64":
                return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return ""

    @_retry_decorator()
    async def register_webhook(
        self,
        owner: str,
        repo: str,
        url: str,
        secret: str,
    ) -> dict:
        async with self._client() as client:
            r = await client.post(
                f"/repos/{owner}/{repo}/hooks",
                json={
                    "name": "web",
                    "active": True,
                    "events": ["pull_request"],
                    "config": {
                        "url": url,
                        "content_type": "json",
                        "secret": secret,
                        "insecure_ssl": "0",
                    },
                },
            )
            r.raise_for_status()
            return r.json()

    @_retry_decorator()
    async def delete_webhook(self, owner: str, repo: str, webhook_id: int) -> None:
        async with self._client() as client:
            r = await client.delete(f"/repos/{owner}/{repo}/hooks/{webhook_id}")
            if r.status_code == 404:
                return  # Already gone
            r.raise_for_status()

    @_retry_decorator()
    async def create_pr_comment(self, owner: str, repo: str, number: int, body: str) -> dict:
        async with self._client() as client:
            r = await client.post(
                f"/repos/{owner}/{repo}/issues/{number}/comments",
                json={"body": body},
            )
            r.raise_for_status()
            return r.json()

    @staticmethod
    def generate_webhook_secret() -> str:
        return secrets.token_hex(32)
