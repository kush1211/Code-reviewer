# Reviewly — Backend

FastAPI backend powering the Reviewly AI PR review pipeline.

## Features

- GitHub OAuth login (Fernet-encrypted token storage)
- Repo connect / disconnect with automatic webhook registration
- HMAC-SHA256 verified webhook receiver
- 3-node LangGraph review pipeline (analyze → review → reflect)
- Provider-agnostic LLM via `init_chat_model` (Anthropic, OpenAI, etc.)
- PostgreSQL + SQLAlchemy 2.0 async
- Redis + RQ background job queue
- Structured logging with `structlog`

## Project Structure

```
backend/
├── app/
│   ├── main.py              FastAPI app, CORS, middleware
│   ├── config.py            Pydantic Settings (env vars)
│   ├── database.py          Async SQLAlchemy engine
│   ├── dependencies.py      JWT auth dep, Redis dep
│   ├── models/              SQLAlchemy ORM models
│   ├── schemas/             Pydantic v2 request/response schemas
│   ├── routers/             FastAPI routers (auth, repos, prs, webhooks)
│   ├── services/            Business logic
│   ├── repositories/        DB CRUD layer
│   ├── github/              GitHub API client + import parser
│   ├── llm/                 LangGraph review pipeline
│   └── workers/             RQ background worker
├── alembic/                 DB migrations
├── tests/
├── docker-compose.yml
├── Dockerfile
└── pyproject.toml
```

## Quick Start (Docker)

```bash
# Copy and fill in secrets
cp .env.example .env

# Start all services (postgres, redis, api, worker)
docker compose up --build

# Run migrations
docker compose exec api alembic upgrade head
```

## Quick Start (Local)

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Copy and fill in secrets
cp .env.example .env

# Run migrations
alembic upgrade head

# Start API
uvicorn app.main:app --reload

# Start worker (separate terminal)
python rq_worker.py
```

## Running Tests

```bash
pytest
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `JWT_SECRET` | Random hex string for JWT signing |
| `FERNET_KEY` | Fernet key for token encryption at rest |
| `ANTHROPIC_API_KEY` | Anthropic API key (if using Anthropic models) |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI models) |
| `LLM_MODEL` | Model string e.g. `anthropic:claude-sonnet-4-5` or `openai:gpt-4o` |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. `http://localhost:3000`) |
| `WEBHOOK_BASE_URL` | Publicly reachable URL for GitHub webhooks (use ngrok in dev) |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/github/login` | No | Returns GitHub OAuth URL |
| POST | `/auth/github/callback` | No | Exchanges code for JWT |
| GET | `/auth/me` | JWT | Current user info |
| GET | `/repos` | JWT | List repos |
| POST | `/repos/{id}/connect` | JWT | Connect repo + register webhook |
| POST | `/repos/{id}/disconnect` | JWT | Disconnect repo |
| GET | `/repos/{id}/prs` | JWT | PR list with review status |
| GET | `/prs/{id}` | JWT | PR detail + review + comments |
| POST | `/prs/{id}/rerun` | JWT | Re-trigger review |
| POST | `/webhooks/github` | HMAC | Webhook receiver |
