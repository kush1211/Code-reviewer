from __future__ import annotations

from pydantic import BaseModel


class WebhookAckResponse(BaseModel):
    status: str = "queued"


class WebhookIgnoredResponse(BaseModel):
    status: str = "ignored"
