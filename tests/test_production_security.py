import pytest

from app.core.config import Settings


def make_settings(**overrides):
    values = {
        "database_url": "postgresql+psycopg://user:password@db:5432/app",
        "jwt_secret_key": "x" * 40,
        "environment": "production",
        "frontend_origins": "https://example.com",
        "redis_url": "redis://redis:6379/0",
        "payment_webhook_secret": "y" * 40,
        "payment_provider": "zarinpal",
        "sms_provider": "kavenegar",
        "kavenegar_api_key": "test-kavenegar-key",
        "kavenegar_otp_template": "otp-template",
        "payment_callback_url": "https://example.com/api/payments/zarinpal/callback",
        "frontend_payment_result_url": "https://example.com/payment/result",
        "zarinpal_merchant_id": "merchant",
        "zarinpal_sandbox": False,
        "expose_legacy_access_token": False,
        "auth_cookie_secure": True,
        "auth_cookie_samesite": "lax",
    }
    values.update(overrides)
    return Settings(**values)


def test_production_settings_accept_valid_configuration():
    make_settings().validate_production()


@pytest.mark.parametrize(
    "field, value",
    [
        ("jwt_secret_key", "short"),
        ("payment_webhook_secret", "change-me"),
        ("frontend_origins", "http://example.com"),
        ("database_url", "sqlite:///./test.db"),
        ("redis_url", "redis://localhost:6379/0"),
        ("payment_provider", "mock"),
        ("sms_provider", "mock"),
        ("zarinpal_sandbox", True),
        ("payment_callback_url", "https:"),
        ("payment_callback_url", "https:///api/callback"),
        ("payment_callback_url", "https://user:secret@example.com/callback"),
        ("frontend_payment_result_url", "https:"),
        ("frontend_payment_result_url", "https:///payment/result"),
        ("frontend_payment_result_url", "https://user:secret@example.com/result"),
    ],
)
def test_production_settings_reject_insecure_values(field, value):
    settings = make_settings(**{field: value})
    with pytest.raises(RuntimeError):
        settings.validate_production()


def test_cors_rejects_untrusted_origin(client):
    response = client.options(
        "/api/offers",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_cors_allows_configured_origin(client):
    response = client.options(
        "/api/offers",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"

def test_cors_allows_csrf_header(client):
    response = client.options(
        "/api/orders",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-csrf-token",
        },
    )
    assert response.status_code == 200
    allowed = response.headers["access-control-allow-headers"].lower()
    assert "x-csrf-token" in allowed



@pytest.mark.parametrize(
    "field,value",
    [
        ("jwt_algorithm", "none"),
        ("jwt_algorithm", "RS256"),
        ("access_token_expire_minutes", 0),
        ("order_payment_timeout_minutes", 0),
        ("rate_limit_requests", 0),
        ("rate_limit_window_seconds", 0),
        ("otp_ttl_seconds", 0),
        ("otp_rate_limit_per_phone", 0),
        ("otp_rate_limit_window_seconds", 0),
        ("payment_http_timeout_seconds", 0),
    ],
)
def test_security_and_timeout_configuration_rejects_invalid_values(field, value):
    settings = make_settings(**{field: value})
    with pytest.raises(RuntimeError):
        settings.validate_production()


def test_request_id_accepts_valid_bounded_identifier(client):
    request_id = "pilot-req_2026.10:abc123"
    response = client.get("/health", headers={"X-Request-ID": request_id})
    assert response.status_code == 200
    assert response.headers["x-request-id"] == request_id


@pytest.mark.parametrize(
    "request_id",
    [
        "x" * 100,
        "bad request id",
        "invalid/with/slashes",
        "newline\\nforged",
    ],
)
def test_request_id_replaces_invalid_untrusted_values(client, request_id):
    response = client.get("/health", headers={"X-Request-ID": request_id})
    assert response.status_code == 200
    generated = response.headers["x-request-id"]
    assert len(generated) == 32
    assert all(character in "0123456789abcdef" for character in generated)


def test_nginx_overwrites_untrusted_forwarded_for_header():
    from pathlib import Path

    nginx_config = Path(__file__).resolve().parents[1] / "docker" / "nginx" / "nginx.conf"
    content = nginx_config.read_text(encoding="utf-8")
    assert content.count("proxy_set_header X-Forwarded-For $remote_addr;") == 3
    assert "$proxy_add_x_forwarded_for" not in content


def test_production_access_logs_do_not_capture_url_paths_or_query_strings():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    nginx = (root / "docker" / "nginx" / "nginx.conf").read_text(encoding="utf-8")
    dockerfile = (root / "Dockerfile.production").read_text(encoding="utf-8")
    compose = (root / "docker-compose.yml").read_text(encoding="utf-8")

    assert "access_log /dev/stdout safe_access;" in nginx
    assert "$request_uri" not in nginx
    assert "$args" not in nginx
    assert '"$request"' not in nginx
    assert "--no-access-log" in dockerfile
    assert "--no-access-log" in compose
