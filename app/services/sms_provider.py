from abc import ABC, abstractmethod
from typing import Any

import requests

from app.core.config import settings


class SMSProvider(ABC):
    @abstractmethod
    def send_otp(self, phone_number: str, code: str) -> None:
        raise NotImplementedError


class MockSMSProvider(SMSProvider):
    def send_otp(self, phone_number: str, code: str) -> None:
        # Deliberately performs no network request. Codes are returned only by
        # the development API response and must never be enabled in production.
        return None


class KavenegarSMSProvider(SMSProvider):
    def send_otp(self, phone_number: str, code: str) -> None:
        if not settings.kavenegar_api_key or not settings.kavenegar_otp_template:
            raise RuntimeError("Kavenegar SMS configuration is incomplete")

        response = requests.get(
            f"https://api.kavenegar.com/v1/{settings.kavenegar_api_key}/verify/lookup.json",
            params={
                "receptor": phone_number,
                "token": code,
                "template": settings.kavenegar_otp_template,
                "type": "sms",
            },
            timeout=settings.payment_http_timeout_seconds,
        )
        response.raise_for_status()
        body: dict[str, Any] = response.json()
        result = body.get("return") or {}
        if result.get("status") != 200:
            raise RuntimeError("SMS provider rejected the OTP request")


def get_sms_provider() -> SMSProvider:
    if settings.sms_provider == "kavenegar":
        return KavenegarSMSProvider()
    if settings.sms_provider == "mock":
        if settings.environment.lower() == "production":
            raise RuntimeError("Mock SMS provider is disabled in production")
        return MockSMSProvider()
    raise RuntimeError("Unsupported SMS_PROVIDER")
