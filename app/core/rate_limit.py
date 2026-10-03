from fastapi import HTTPException, Request
from redis import Redis
from redis.exceptions import RedisError

from app.core.config import settings


redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


def check_rate_limit(request: Request, bucket: str) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"rl:{bucket}:{client_ip}"

    try:
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, settings.rate_limit_window_seconds)
    except RedisError:
        if settings.environment == "production":
            raise HTTPException(
                status_code=503,
                detail="Rate limiting service is unavailable",
            )
        return

    if count > settings.rate_limit_requests:
        raise HTTPException(status_code=429, detail="Too many requests")
