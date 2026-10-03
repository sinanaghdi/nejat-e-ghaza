from dataclasses import dataclass
from decimal import Decimal


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
        reference_id = f"REF-{authority}"
        return PaymentVerifyResult(success=True, reference_id=reference_id)


def get_payment_provider() -> PaymentProvider:
    # Production providers can be selected from configuration later.
    return MockPaymentProvider()
