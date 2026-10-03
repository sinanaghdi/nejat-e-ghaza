from typing import Any

from fastapi import APIRouter, Response, status
from redis import Redis
from sqlalchemy import text

from app.core.config import settings
from app.db.database import engine

router = APIRouter(tags=["health"])


def _check_database() -> str:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        return "error"


def _check_redis() -> str:
    try:
        Redis.from_url(settings.redis_url).ping()
        return "ok"
    except Exception:
        return "error"


@router.get("/health")
def health_check() -> dict[str, Any]:
    # Liveness endpoint: the process is alive even if a dependency is degraded.
    return {"status": "ok"}


@router.get("/health/ready")
def readiness_check(response: Response) -> dict[str, Any]:
    database = _check_database()
    redis = _check_redis()
    healthy = database == "ok" and redis == "ok"

    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if healthy else "not_ready",
        "checks": {"database": database, "redis": redis},
    }
