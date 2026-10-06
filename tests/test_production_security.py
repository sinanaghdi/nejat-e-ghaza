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
        ("zarinpal_sandbox", True),
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
