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
from app.core.security import hash_password
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



def test_admin_can_reconcile_refund_required_payment(client, db, monkeypatch):
    _, order, payment = create_pending_order_with_payment(db)
    order.status = OrderStatus.CANCELLED
    db.commit()

    provider = SuccessfulMockProvider()
    monkeypatch.setattr(payment_service, "get_payment_provider", lambda: provider)
    payment_service.verify_payment(db, payment.authority)

    admin = User(
        name="Refund Queue Admin",
        email="refund-queue-admin@example.com",
        password_hash=hash_password("secure-test-password-123"),
        role=UserRole.ADMIN,
    )
    db.add(admin)
    db.commit()

    token_response = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": "secure-test-password-123"},
    )
    assert token_response.status_code == 200
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}

    queue = client.get("/api/admin/payments/refund-required", headers=headers)
    assert queue.status_code == 200
    assert [item["id"] for item in queue.json()] == [payment.id]

    marked = client.patch(
        f"/api/admin/payments/{payment.id}/refund-completed",
        json={"refund_reference": "BANK-REFUND-123"},
        headers=headers,
    )
    assert marked.status_code == 200
    assert marked.json()["status"] == "REFUNDED"

    empty_queue = client.get("/api/admin/payments/refund-required", headers=headers)
    assert empty_queue.status_code == 200
    assert empty_queue.json() == []

    # A repeated provider callback after manual reconciliation remains idempotent.
    repeated = payment_service.verify_payment(db, payment.authority)
    assert repeated.status == "REFUNDED"
    assert provider.verify_calls == 1



def test_non_admin_cannot_access_refund_queue_or_mark_refund(client, db):
    customer = User(
        name="Refund Queue Customer",
        email="refund-queue-customer@example.com",
        password_hash=hash_password("secure-test-password-456"),
        role=UserRole.CUSTOMER,
    )
    db.add(customer)
    db.commit()

    token_response = client.post(
        "/api/auth/login",
        json={"email": customer.email, "password": "secure-test-password-456"},
    )
    assert token_response.status_code == 200
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}

    queue = client.get("/api/admin/payments/refund-required", headers=headers)
    assert queue.status_code == 403

    marked = client.patch(
        "/api/admin/payments/8101/refund-completed",
        json={"refund_reference": "BANK-REFUND-456"},
        headers=headers,
    )
    assert marked.status_code == 403
