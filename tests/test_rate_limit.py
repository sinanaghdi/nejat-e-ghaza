import os
import uuid

import pytest
from redis import Redis
from fastapi import HTTPException
from redis.exceptions import ConnectionError

from app.core import rate_limit


class FakeRedis:
    def __init__(self, result: int = 1):
        self.result = result
        self.calls: list[tuple[str, int, str, int]] = []

    def eval(self, script: str, key_count: int, key: str, window: int) -> int:
        self.calls.append((script, key_count, key, window))
        return self.result


class UnavailableRedis:
    def eval(self, *_args, **_kwargs):
        raise ConnectionError("redis unavailable")


def make_request(client_host: str = "203.0.113.12"):
    from starlette.requests import Request

    return Request({
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [],
        "client": (client_host, 12345),
        "server": ("testserver", 80),
        "scheme": "http",
    })


def test_rate_limit_uses_atomic_increment_and_expiry(monkeypatch):
    fake = FakeRedis(result=1)
    monkeypatch.setattr(rate_limit, "redis_client", fake)

    rate_limit.check_rate_limit(make_request(), "login", limit=3, window_seconds=60)

    assert len(fake.calls) == 1
    script, key_count, key, window = fake.calls[0]
    assert key_count == 1
    assert key == "rl:login:203.0.113.12"
    assert window == 60
    assert "INCR" in script
    assert "TTL" in script
    assert "EXPIRE" in script


def test_rate_limit_raises_after_configured_threshold(monkeypatch):
    fake = FakeRedis(result=4)
    monkeypatch.setattr(rate_limit, "redis_client", fake)

    with pytest.raises(HTTPException) as error:
        rate_limit.check_rate_limit(make_request(), "otp", limit=3, window_seconds=60)

    assert error.value.status_code == 429


def test_global_rate_limit_does_not_include_client_ip(monkeypatch):
    fake = FakeRedis(result=1)
    monkeypatch.setattr(rate_limit, "redis_client", fake)

    rate_limit.check_rate_limit(
        make_request("198.51.100.2"),
        "signup",
        limit=5,
        window_seconds=3600,
        scope="global",
    )

    assert fake.calls[0][2] == "rl:signup"


def test_production_rate_limit_fails_closed_when_redis_is_unavailable(monkeypatch):
    monkeypatch.setattr(rate_limit, "redis_client", UnavailableRedis())
    monkeypatch.setattr(rate_limit.settings, "environment", "production")

    with pytest.raises(HTTPException) as error:
        rate_limit.check_rate_limit(make_request(), "login")

    assert error.value.status_code == 503


def test_development_rate_limit_fails_open_when_redis_is_unavailable(monkeypatch):
    monkeypatch.setattr(rate_limit, "redis_client", UnavailableRedis())
    monkeypatch.setattr(rate_limit.settings, "environment", "development")

    rate_limit.check_rate_limit(make_request(), "login")


@pytest.mark.parametrize("limit,window", [(0, 60), (5, 0), (-1, 60)])
def test_rate_limit_rejects_invalid_policy(limit, window):
    with pytest.raises(ValueError):
        rate_limit.check_rate_limit(
            make_request(),
            "invalid",
            limit=limit,
            window_seconds=window,
        )



def test_rate_limit_lua_executes_against_real_redis(monkeypatch):
    redis_url = os.getenv("REDIS_TEST_URL")
    if not redis_url:
        pytest.skip("REDIS_TEST_URL is not configured")

    client = Redis.from_url(redis_url, decode_responses=True)
    key = None
    try:
        client.ping()
        monkeypatch.setattr(rate_limit, "redis_client", client)
        bucket = f"lua-integration-{uuid.uuid4().hex}"
        key = f"rl:{bucket}:203.0.113.12"

        rate_limit.check_rate_limit(
            make_request(),
            bucket,
            limit=2,
            window_seconds=60,
        )
        assert client.get(key) == "1"
        assert 0 < client.ttl(key) <= 60

        rate_limit.check_rate_limit(
            make_request(),
            bucket,
            limit=2,
            window_seconds=60,
        )
        assert client.get(key) == "2"

        with pytest.raises(HTTPException) as error:
            rate_limit.check_rate_limit(
                make_request(),
                bucket,
                limit=2,
                window_seconds=60,
            )
        assert error.value.status_code == 429
        assert 0 < client.ttl(key) <= 60
    finally:
        if key:
            client.delete(key)
        client.close()


def test_subject_rate_limit_uses_authenticated_subject_key(monkeypatch):
    fake = FakeRedis(result=1)
    monkeypatch.setattr(rate_limit, "redis_client", fake)

    rate_limit.check_rate_limit(
        make_request("198.51.100.9"),
        "pickup-verify",
        limit=30,
        window_seconds=60,
        scope="subject",
        subject_id=42,
    )

    assert fake.calls[0][2] == "rl:pickup-verify:subject:42"


def test_subject_rate_limit_requires_subject_id():
    with pytest.raises(ValueError):
        rate_limit.check_rate_limit(
            make_request(),
            "pickup-verify",
            scope="subject",
        )
