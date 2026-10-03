from dataclasses import dataclass
from decimal import Decimal
from typing import Any

import requests

from app.core.config import settings


@dataclass(frozen=True)
class PaymentRequest:
    amount: Decimal
    order_id: int


@dataclass(frozen=True)
class PaymentStartResult:
    authority: str
    checkout_url: str


@dataclass(frozen=True)
class PaymentVerifyResult:
    success: bool
    reference_id: str | None = None


class PaymentProvider:
    name = "base"

    def start(self, request: PaymentRequest) -> PaymentStartResult:
        raise NotImplementedError

    def verify(self, authority: str, amount: Decimal) -> PaymentVerifyResult:
        raise NotImplementedError


class MockPaymentProvider(PaymentProvider):
    name = "mock"

    def start(self, request: PaymentRequest) -> PaymentStartResult:
        authority = f"MOCK-{request.order_id}-{request.amount}"
        return PaymentStartResult(
            authority=authority,
            checkout_url=f"/api/payments/mock/checkout/{authority}",
        )

    def verify(self, authority: str, amount: Decimal) -> PaymentVerifyResult:
        if not authority.startswith("MOCK-"):
            return PaymentVerifyResult(success=False)
        return PaymentVerifyResult(success=True, reference_id=f"REF-{authority}")


class ZarinpalPaymentProvider(PaymentProvider):
    name = "zarinpal"

    def _api_base(self) -> str:
        return (
            "https://sandbox.zarinpal.com"
            if settings.zarinpal_sandbox
            else "https://api.zarinpal.com"
        )

    def _checkout_base(self) -> str:
        return (
            "https://sandbox.zarinpal.com/pg/StartPay/"
            if settings.zarinpal_sandbox
            else "https://www.zarinpal.com/pg/StartPay/"
        )

    @staticmethod
    def _rial_amount(amount_toman: Decimal) -> int:
        return int(amount_toman * Decimal("10"))

    def start(self, request: PaymentRequest) -> PaymentStartResult:
        if not settings.zarinpal_merchant_id or not settings.payment_callback_url:
            raise RuntimeError("ZarinPal payment configuration is incomplete")

        payload = {
            "merchant_id": settings.zarinpal_merchant_id,
            "amount": self._rial_amount(request.amount),
            "description": f"سفارش نجات غذا #{request.order_id}",
            "callback_url": f"{settings.payment_callback_url}?order_id={request.order_id}",
        }

        response = requests.post(
            f"{self._api_base()}/pg/v4/payment/request.json",
            json=payload,
            timeout=settings.payment_http_timeout_seconds,
        )
        response.raise_for_status()
        body: dict[str, Any] = response.json()
        data = body.get("data") or {}
        code = data.get("code")

        if code != 100 or not data.get("authority"):
            errors = body.get("errors") or {}
            raise RuntimeError(f"ZarinPal payment request failed: {errors or data}")

        authority = str(data["authority"])
        return PaymentStartResult(
            authority=authority,
            checkout_url=f"{self._checkout_base()}{authority}",
        )

    def verify(self, authority: str, amount: Decimal) -> PaymentVerifyResult:
        if not settings.zarinpal_merchant_id:
            raise RuntimeError("ZarinPal merchant ID is not configured")

        payload = {
            "merchant_id": settings.zarinpal_merchant_id,
            "amount": self._rial_amount(amount),
            "authority": authority,
        }
        response = requests.post(
            f"{self._api_base()}/pg/v4/payment/verify.json",
            json=payload,
            timeout=settings.payment_http_timeout_seconds,
        )
        response.raise_for_status()
        body: dict[str, Any] = response.json()
        data = body.get("data") or {}
        code = data.get("code")

        if code in (100, 101):
            return PaymentVerifyResult(
                success=True,
                reference_id=str(data.get("ref_id")) if data.get("ref_id") is not None else None,
            )

        return PaymentVerifyResult(success=False)


def get_payment_provider() -> PaymentProvider:
    if settings.payment_provider == "zarinpal":
        return ZarinpalPaymentProvider()
    return MockPaymentProvider()
