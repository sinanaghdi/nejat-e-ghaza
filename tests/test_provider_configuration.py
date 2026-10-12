import pytest

from app.core.config import Settings
from app.services import payment_provider


def make_settings(
    *,
    environment: str = "development",
    payment_provider_name: str = "mock",
    sms_provider_name: str = "mock",
) -> Settings:
    return Settings(
        database_url="sqlite:///./test.db",
        jwt_secret_key="test-secret-for-provider-tests",
        environment=environment,
        payment_provider=payment_provider_name,
        sms_provider=sms_provider_name,
    )


def test_unknown_payment_provider_is_rejected_by_settings() -> None:
    settings = make_settings(payment_provider_name="zarinpal-sandox")

    with pytest.raises(RuntimeError, match="Unsupported PAYMENT_PROVIDER"):
        settings.validate_production()


def test_unknown_sms_provider_is_rejected_by_settings() -> None:
    settings = make_settings(sms_provider_name="kavenegar-typo")

    with pytest.raises(RuntimeError, match="Unsupported SMS_PROVIDER"):
        settings.validate_production()


def test_payment_provider_factory_does_not_fall_back_to_mock(monkeypatch) -> None:
    configured = make_settings(payment_provider_name="unrecognized-gateway")
    monkeypatch.setattr(payment_provider, "settings", configured)

    with pytest.raises(RuntimeError, match="Unsupported PAYMENT_PROVIDER"):
        payment_provider.get_payment_provider()


def test_mock_payment_provider_is_blocked_in_production(monkeypatch) -> None:
    configured = make_settings(
        environment="production",
        payment_provider_name="mock",
    )
    monkeypatch.setattr(payment_provider, "settings", configured)

    with pytest.raises(RuntimeError, match="Mock payment provider is disabled in production"):
        payment_provider.get_payment_provider()


def test_mock_payment_provider_remains_available_for_development(monkeypatch) -> None:
    configured = make_settings(payment_provider_name="mock")
    monkeypatch.setattr(payment_provider, "settings", configured)

    selected = payment_provider.get_payment_provider()

    assert isinstance(selected, payment_provider.MockPaymentProvider)
