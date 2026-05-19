"""RQ worker entrypoint. Run with: python rq_worker.py"""
from __future__ import annotations

import os

import structlog
from redis import Redis
from rq import Worker

from app.config import get_settings

settings = get_settings()

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)

if __name__ == "__main__":
    redis_conn = Redis.from_url(settings.REDIS_URL)
    queues = ["default"]
    worker = Worker(queues, connection=redis_conn)
    worker.work(with_scheduler=True)
