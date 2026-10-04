from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.db.models.food_offer import FoodOffer
from app.db.models.merchant import Merchant
from app.db.models.order import Order
from app.db.models.order_item import OrderItem
from app.db.models.user import User
from app.models.enums import OrderStatus, UserRole
from app.services.order import expire_pending_orders
from app.core.config import settings
from app.core.security import hash_password


def _setup_expiring_order(db):
    customer = User(
        name="Expiration Customer",
        email="expiration-customer@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    merchant_user = User(
        name="Expiration Merchant",
        email="expiration-merchant@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    db.add_all([customer, merchant_user])
    db.commit()

    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Expiration Cafe",
        address="Main St",
        city="Babolsar",
    )
    db.add(merchant)
    db.commit()

    offer = FoodOffer(
        merchant_id=merchant.id,
        title="Reserved Box",
        original_price=Decimal("100.00"),
        sale_price=Decimal("50.00"),
        quantity=3,
        available_quantity=1,
        pickup_start=datetime.now(timezone.utc),
        pickup_end=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    db.add(offer)
    db.commit()

    order = Order(
        customer_id=customer.id,
        merchant_id=merchant.id,
        total_amount=Decimal("100.00"),
        status=OrderStatus.PENDING,
        pickup_code="EXPIRE01",
        created_at=datetime.now(timezone.utc)
        - timedelta(minutes=settings.order_payment_timeout_minutes + 1),
    )
    db.add(order)
    db.flush()

    db.add(
        OrderItem(
            order_id=order.id,
            food_offer_id=offer.id,
            quantity=2,
            unit_price=offer.sale_price,
            subtotal=Decimal("100.00"),
        )
    )
    db.commit()
    return order, offer


def test_expire_pending_order_restores_inventory_and_marks_expired(db):
    order, offer = _setup_expiring_order(db)

    expired = expire_pending_orders(db)

    assert expired == 1
    db.refresh(order)
    db.refresh(offer)
    assert order.status == OrderStatus.EXPIRED
    assert offer.available_quantity == 3


def test_expiration_is_idempotent(db):
    order, offer = _setup_expiring_order(db)

    first = expire_pending_orders(db)
    second = expire_pending_orders(db)

    assert first == 1
    assert second == 0
    db.refresh(order)
    db.refresh(offer)
    assert order.status == OrderStatus.EXPIRED
    assert offer.available_quantity == 3


def test_recent_pending_order_is_not_expired(db):
    order, offer = _setup_expiring_order(db)
    order.created_at = datetime.now(timezone.utc)
    db.commit()

    expired = expire_pending_orders(db)

    assert expired == 0
    db.refresh(order)
    db.refresh(offer)
    assert order.status == OrderStatus.PAID
    assert offer.available_quantity == 1


def test_paid_payment_is_not_expired(db):
    from app.db.models.payment import Payment

    order, offer = _setup_expiring_order(db)
    payment = Payment(
        order_id=order.id,
        provider="mock",
        authority="MOCK-PAID-ORDER",
        amount=order.total_amount,
        status="PAID",
        reference_id="REF-PAID-ORDER",
    )
    db.add(payment)
    db.commit()

    expired = expire_pending_orders(db)

    assert expired == 0
    db.refresh(order)
    db.refresh(offer)
    assert order.status == OrderStatus.PENDING
    assert offer.available_quantity == 1
