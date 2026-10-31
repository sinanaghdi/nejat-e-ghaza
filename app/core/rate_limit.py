from fastapi import HTTPException, Request
from redis import Redis
from redis.exceptions import RedisError

from app.core.config import settings


redis_client = Redis.from_url(settings.redis_url, decode_responses=True)

# Keep increment and expiry in one Redis operation. A process crash between
# separate INCR and EXPIRE commands can otherwise leave a permanent counter.
_RATE_LIMIT_INCREMENT_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
"""


def check_rate_limit(
    request: Request,
    bucket: str,
    *,
    limit: int | None = None,
    window_seconds: int | None = None,
    scope: str = "ip",
    subject_id: int | str | None = None,
) -> None:
    client_ip = request.client.host if request.client else "unknown"
    if scope == "global":
        key = f"rl:{bucket}"
    elif scope == "ip":
        key = f"rl:{bucket}:ip:{client_ip}"
    elif scope == "subject":
        if subject_id is None or not str(subject_id).strip():
            raise ValueError("subject_id is required for subject-scoped rate limits")
        key = f"rl:{bucket}:subject:{subject_id}"
    else:
        raise ValueError("Rate limit scope must be 'ip', 'subject', or 'global'")

    effective_limit = limit if limit is not None else settings.rate_limit_requests
    effective_window = window_seconds if window_seconds is not None else settings.rate_limit_window_seconds
    if effective_limit < 1 or effective_window < 1:
        raise ValueError("Rate limit and window must both be positive integers")

    try:
        count = int(
            redis_client.eval(
                _RATE_LIMIT_INCREMENT_SCRIPT,
                1,
                key,
                effective_window,
            )
        )
    except RedisError:
        if settings.environment.lower() == "production":
            raise HTTPException(
                status_code=503,
                detail="Rate limiting service is unavailable",
            )
        return

    if count > effective_limit:
        raise HTTPException(status_code=429, detail="Too many requests")
