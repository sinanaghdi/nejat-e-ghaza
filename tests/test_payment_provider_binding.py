from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.db.models.merchant import Merchant
from app.db.models.merchant_settlement import MerchantSettlement
from app.db.models.order import Order
from app.db.models.payment import Payment
from app.db.models.user import User
from app.models.enums import OrderStatus, UserRole
from app.services import payment as payment_service
from app.services.payment_provider import PaymentVerifyResult


class DifferentPaymentProvider:
    name = "zarinpal"

    def start(self, request):
        raise AssertionError("A new checkout must not be started for an active old-provider payment")

    def verify(self, authority, amount):
        raise AssertionError("A payment authority must not be verified by a different provider")


def create_pending_order_with_payment(db):
    customer = User(
        name="Payment Test Customer",
        email="provider-switch-customer@example.com",
        password_hash=None,
        role=UserRole.CUSTOMER,
    )
    merchant_user = User(
        name="Payment Test Merchant",
        email="provider-switch-merchant@example.com",
        password_hash=None,
        role=UserRole.MERCHANT,
    )
    db.add_all([customer, merchant_user])
    db.commit()

    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Provider Switch Cafe",
        address="Test Street",
        city="Babolsar",
        verification_status="VERIFIED",
    )
    db.add(merchant)
    db.commit()

    order = Order(
        customer_id=customer.id,
        merchant_id=merchant.id,
        total_amount=Decimal("125.00"),
        status=OrderStatus.PENDING,
        pickup_code="SWITCHTEST01",
    )
    db.add(order)
    db.commit()

    payment = Payment(
        order_id=order.id,
        provider="mock",
        authority=f"MOCK-{order.id}-125.00",
        amount=Decimal("125.00"),
        status="PENDING",
    )
    db.add(payment)
    db.commit()
    db.refresh(order)
    db.refresh(payment)
    return customer, order, payment


def test_create_payment_rejects_active_attempt_from_different_provider(db, monkeypatch):
    customer, order, payment = create_pending_order_with_payment(db)
    monkeypatch.setattr(
        payment_service,
        "get_payment_provider",
        lambda: DifferentPaymentProvider(),
    )

    with pytest.raises(HTTPException) as exc_info:
        payment_service.create_payment(db, customer, order.id)

    assert exc_info.value.status_code == 409
    assert "provider changed" in exc_info.value.detail.lower()
    db.refresh(payment)
    assert payment.authority == f"MOCK-{order.id}-125.00"
    assert payment.status == "PENDING"


def test_verify_payment_rejects_authority_from_different_provider(db, monkeypatch):
    _, order, payment = create_pending_order_with_payment(db)
    monkeypatch.setattr(
        payment_service,
        "get_payment_provider",
        lambda: DifferentPaymentProvider(),
    )

    with pytest.raises(HTTPException) as exc_info:
        payment_service.verify_payment(db, payment.authority)

    assert exc_info.value.status_code == 409
    assert "does not match" in exc_info.value.detail.lower()
    db.refresh(order)
    db.refresh(payment)
    assert order.status == OrderStatus.PENDING
    assert payment.status == "PENDING"



class SuccessfulMockProvider:
    name = "mock"

    def __init__(self):
        self.verify_calls = 0

    def verify(self, authority, amount):
        self.verify_calls += 1
        return PaymentVerifyResult(success=True, reference_id="MOCK-REFUND-REF")


def test_successful_callback_after_order_expiry_is_queued_for_refund(db, monkeypatch):
    _, order, payment = create_pending_order_with_payment(db)
    order.status = OrderStatus.EXPIRED
    db.commit()

    provider = SuccessfulMockProvider()
    monkeypatch.setattr(payment_service, "get_payment_provider", lambda: provider)

    verified = payment_service.verify_payment(db, payment.authority)

    assert verified.status == "REFUND_REQUIRED"
    assert verified.reference_id == "MOCK-REFUND-REF"
    db.refresh(order)
    assert order.status == OrderStatus.EXPIRED
    assert db.scalar(
        select(MerchantSettlement).where(MerchantSettlement.payment_id == payment.id)
    ) is None

    # Repeated gateway callbacks must not re-verify or create duplicate liabilities.
    repeated = payment_service.verify_payment(db, payment.authority)
    assert repeated.status == "REFUND_REQUIRED"
    assert provider.verify_calls == 1
    assert db.scalar(
        select(MerchantSettlement).where(MerchantSettlement.payment_id == payment.id)
    ) is None
