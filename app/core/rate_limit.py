from fastapi import HTTPException, Request
from redis import Redis
from redis.exceptions import RedisError

from app.core.config import settings


redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


def check_rate_limit(
    request: Request,
    bucket: str,
    *,
    limit: int | None = None,
    window_seconds: int | None = None,
) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"rl:{bucket}:{client_ip}"
    effective_limit = limit if limit is not None else settings.rate_limit_requests
    effective_window = window_seconds if window_seconds is not None else settings.rate_limit_window_seconds

    try:
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, effective_window)
    except RedisError:
        if settings.environment == "production":
            raise HTTPException(
                status_code=503,
                detail="Rate limiting service is unavailable",
            )
        return

    if count > effective_limit:
        raise HTTPException(status_code=429, detail="Too many requests")
