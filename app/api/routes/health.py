from typing import Any

from fastapi import APIRouter
from redis import Redis
from sqlalchemy import text

from app.core.config import settings
from app.db.database import engine

router = APIRouter(tags=["health"])


def _check_database() -> tuple[str, str | None]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "ok", None
    except Exception as exc:
        return "error", str(exc)


def _check_redis() -> tuple[str, str | None]:
    try:
        Redis.from_url(settings.redis_url).ping()
        return "ok", None
    except Exception as exc:
        return "error", str(exc)


@router.get("/health")
def health_check() -> dict[str, Any]:
    database, _ = _check_database()
    redis, _ = _check_redis()
    status = "ok" if database == "ok" and redis == "ok" else "degraded"
    return {"status": status, "checks": {"database": database, "redis": redis}}


@router.get("/health/ready")
def readiness_check() -> dict[str, Any]:
    database, database_error = _check_database()
    redis, redis_error = _check_redis()
    healthy = database == "ok" and redis == "ok"
    response: dict[str, Any] = {
        "status": "ready" if healthy else "not_ready",
        "checks": {"database": database, "redis": redis},
    }
    if database_error:
        response["checks"]["database_error"] = database_error
    if redis_error:
        response["checks"]["redis_error"] = redis_error
    return response
