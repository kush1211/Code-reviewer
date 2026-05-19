from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_redis
from app.services import webhook_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/github")
async def github_webhook(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis_conn=Depends(get_redis),
    x_hub_signature_256: str | None = Header(default=None),
    x_github_event: str | None = Header(default=None),
) -> dict:
    # Read raw bytes BEFORE any parsing — required for HMAC verification
    raw_body = await request.body()

    result = await webhook_service.handle_webhook(
        db=db,
        raw_body=raw_body,
        signature_header=x_hub_signature_256,
        event_type=x_github_event or "",
        redis_conn=redis_conn,
    )
    return result
