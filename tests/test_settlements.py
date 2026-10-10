from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.config import settings
from app.core.security import hash_password
from app.db.models.merchant import Merchant
from app.db.models.merchant_settlement import MerchantSettlement
from app.db.models.order import Order
from app.db.models.payment import Payment
from app.db.models.user import User
from app.models.enums import OrderStatus, UserRole
from app.services.payment import verify_payment


def test_verified_payment_creates_commission_ledger_once(db, monkeypatch):
    monkeypatch.setattr(settings, "platform_commission_bps", 1000)
    customer = User(
        name="Customer",
        email="settlement-customer@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    merchant_user = User(
        name="Merchant",
        email="settlement-merchant@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    db.add_all([customer, merchant_user])
    db.commit()
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Settlement Cafe",
        address="Main",
        city="Babolsar",
    )
    db.add(merchant)
    db.commit()

    order = Order(
        customer_id=customer.id,
        merchant_id=merchant.id,
        total_amount=Decimal("125000"),
        status=OrderStatus.PENDING,
        pickup_code="SETTLE123",
    )
    db.add(order)
    db.commit()
    payment = Payment(
        order_id=order.id,
        provider="mock",
        authority="MOCK-SETTLEMENT-1",
        amount=Decimal("125000"),
        status="PENDING",
    )
    db.add(payment)
    db.commit()

    class Provider:
        def verify(self, authority, amount):
            return type("Result", (), {"success": True, "reference_id": "REF-SETTLE"})()

    monkeypatch.setattr("app.services.payment.get_payment_provider", lambda: Provider())

    verified = verify_payment(db, payment.authority, expected_order_id=order.id)
    assert verified.status == "PAID"

    settlement = db.query(MerchantSettlement).one()
    assert settlement.gross_amount == Decimal("125000.00")
    assert settlement.commission_rate_bps == 1000
    assert settlement.commission_amount == Decimal("12500.00")
    assert settlement.net_amount == Decimal("112500.00")
    assert settlement.status == "PENDING"

    # Callback retries remain idempotent and do not duplicate settlement rows.
    verify_payment(db, payment.authority, expected_order_id=order.id)
    assert db.query(MerchantSettlement).count() == 1
