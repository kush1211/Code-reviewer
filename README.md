# Reviewly — AI-Powered GitHub PR Reviewer

Reviewly automatically reviews your GitHub pull requests using a multi-step AI pipeline built on LangGraph. It posts structured feedback — verdict, summary, and inline comments — directly to your PRs.

## Architecture

```
Code reviewer/
├── frontend/   Next.js 14 dashboard (repos, PRs, review detail)
└── backend/    FastAPI + LangGraph review pipeline
```

## How it works

1. You connect a GitHub repo via the dashboard
2. Reviewly registers a webhook on that repo
3. When a PR is opened or updated, the webhook fires
4. A background worker runs a **3-node LangGraph pipeline**:
   - **Analyze** — reads the diff to understand intent and risk areas
   - **Review** — full context review guided by the analysis
   - **Reflect** — self-correction pass to remove false positives and calibrate severity
5. The review (verdict + comments) is stored in the DB and posted back to the PR on GitHub

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Backend | FastAPI, SQLAlchemy 2.0 async, Alembic |
| AI Pipeline | LangGraph, LangChain (`init_chat_model`) |
| Queue | Redis + RQ |
| Database | PostgreSQL |
| Auth | GitHub OAuth + JWT |

## Quick Start

See [`frontend/README.md`](./frontend/README.md) and [`backend/README.md`](./backend/README.md) for setup instructions.
