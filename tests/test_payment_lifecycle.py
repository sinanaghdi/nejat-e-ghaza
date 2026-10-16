from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.db.models.merchant import Merchant
from app.db.models.merchant_settlement import MerchantSettlement
from app.db.models.order import Order
from app.db.models.payment import Payment
from app.db.models.user import User
from app.models.enums import OrderStatus, UserRole
from app.services import payment as payment_service
from app.services.payment_provider import PaymentStartResult, PaymentVerifyResult


class SuccessfulLifecycleProvider:
    name = "mock"

    def __init__(self):
        self.verify_calls = 0

    def start(self, request):
        return PaymentStartResult(
            authority=f"MOCK-LIFECYCLE-{request.order_id}",
            checkout_url=f"https://payments.example.test/{request.order_id}",
        )

    def verify(self, authority, amount):
        self.verify_calls += 1
        assert authority.startswith("MOCK-LIFECYCLE-")
        assert amount == Decimal("125.00")
        return PaymentVerifyResult(success=True, reference_id="TEST-REFERENCE-001")


def create_pending_order(db):
    customer = User(
        name="Lifecycle Customer",
        email="lifecycle-customer@example.com",
        password_hash=hash_password("secure-test-password-123"),
        role=UserRole.CUSTOMER,
    )
    merchant_user = User(
        name="Lifecycle Merchant",
        email="lifecycle-merchant@example.com",
        password_hash=hash_password("secure-test-password-123"),
        role=UserRole.MERCHANT,
    )
    db.add_all([customer, merchant_user])
    db.commit()

    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Lifecycle Cafe",
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
        pickup_code="LIFECYCLE001",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return customer, order


def test_successful_payment_marks_order_paid_and_creates_one_settlement(
    db, monkeypatch
):
    customer, order = create_pending_order(db)
    provider = SuccessfulLifecycleProvider()
    monkeypatch.setattr(
        payment_service, "get_payment_provider", lambda: provider
    )

    payment = payment_service.create_payment(db, customer, order.id)
    assert payment.status == "PENDING"
    assert payment.provider == "mock"

    verified = payment_service.verify_payment(db, payment.authority)

    assert verified.status == "PAID"
    assert verified.reference_id == "TEST-REFERENCE-001"
    db.refresh(order)
    assert order.status == OrderStatus.PAID
    assert db.scalar(
        select(MerchantSettlement).where(
            MerchantSettlement.payment_id == payment.id
        )
    ) is not None

    # Duplicate gateway callbacks must not re-verify or duplicate settlement.
    repeated = payment_service.verify_payment(db, payment.authority)
    assert repeated.status == "PAID"
    assert provider.verify_calls == 1
    assert len(
        db.scalars(
            select(MerchantSettlement).where(
                MerchantSettlement.payment_id == payment.id
            )
        ).all()
    ) == 1

    db.refresh(payment)
    assert payment.status == "PAID"
