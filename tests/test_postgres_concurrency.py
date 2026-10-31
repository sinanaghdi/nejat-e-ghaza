import os
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, event as sqlalchemy_event, select
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models.food_offer import FoodOffer
from app.db.models.merchant import Merchant
from app.db.models.order import Order
from app.db.models.user import User
from app.models.enums import UserRole
from app.schemas.order import OrderCreate
from app.schemas.offer import OfferUpdate
from app.services.order import create_order
from app.services.offer import update_offer
from app.core.security import hash_password
from fastapi import HTTPException


POSTGRES_TEST_DATABASE_URL = os.getenv("POSTGRES_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not POSTGRES_TEST_DATABASE_URL,
    reason="POSTGRES_TEST_DATABASE_URL is not configured",
)


@pytest.fixture()
def postgres_session_factory():
    engine = create_engine(
        POSTGRES_TEST_DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    try:
        yield SessionLocal
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_concurrent_orders_cannot_oversell(postgres_session_factory):
    setup_db = postgres_session_factory()

    try:
        customer_one = User(
            name="Customer One",
            email="pg-concurrency-one@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.CUSTOMER,
        )
        customer_two = User(
            name="Customer Two",
            email="pg-concurrency-two@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.CUSTOMER,
        )
        merchant_user = User(
            name="Merchant",
            email="pg-concurrency-merchant@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.MERCHANT,
        )
        setup_db.add_all([customer_one, customer_two, merchant_user])
        setup_db.commit()

        merchant = Merchant(
            user_id=merchant_user.id,
            business_name="Concurrency Cafe",
            address="Main St",
            city="Babolsar",
            verification_status="VERIFIED",
        )
        setup_db.add(merchant)
        setup_db.commit()

        offer = FoodOffer(
            merchant_id=merchant.id,
            title="Last Food Box",
            original_price=Decimal("100.00"),
            sale_price=Decimal("50.00"),
            quantity=1,
            available_quantity=1,
            moderation_status="APPROVED",
            pickup_start=datetime.now(timezone.utc),
            pickup_end=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        setup_db.add(offer)
        setup_db.commit()

        customer_one_id = customer_one.id
        customer_two_id = customer_two.id
        offer_id = offer.id
    finally:
        setup_db.close()

    def attempt_order(customer_id):
        db = postgres_session_factory()
        try:
            customer = db.get(User, customer_id)
            payload = OrderCreate(
                items=[{"food_offer_id": offer_id, "quantity": 1}]
            )
            try:
                order = create_order(db, customer, payload)
                return ("success", order.id)
            except HTTPException as exc:
                return ("http_error", exc.status_code)
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(
            executor.map(attempt_order, [customer_one_id, customer_two_id])
        )

    assert sum(result[0] == "success" for result in results) == 1
    assert sum(result == ("http_error", 409) for result in results) == 1

    verify_db = postgres_session_factory()
    try:
        final_offer = verify_db.get(FoodOffer, offer_id)
        assert final_offer.available_quantity == 0
    finally:
        verify_db.close()



def test_concurrent_offer_edit_and_order_reservation_preserve_inventory(postgres_session_factory):
    setup_db = postgres_session_factory()
    try:
        customer = User(
            name="Inventory Customer",
            email="pg-inventory-customer@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.CUSTOMER,
        )
        merchant_user = User(
            name="Inventory Merchant",
            email="pg-inventory-merchant@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.MERCHANT,
        )
        setup_db.add_all([customer, merchant_user])
        setup_db.commit()

        merchant = Merchant(
            user_id=merchant_user.id,
            business_name="Inventory Race Cafe",
            address="Main St",
            city="Babolsar",
            verification_status="VERIFIED",
        )
        setup_db.add(merchant)
        setup_db.commit()

        offer = FoodOffer(
            merchant_id=merchant.id,
            title="Inventory Race Offer",
            original_price=Decimal("100.00"),
            sale_price=Decimal("50.00"),
            quantity=5,
            available_quantity=5,
            moderation_status="APPROVED",
            pickup_start=datetime.now(timezone.utc),
            pickup_end=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        setup_db.add(offer)
        setup_db.commit()

        customer_id = customer.id
        merchant_user_id = merchant_user.id
        offer_id = offer.id
    finally:
        setup_db.close()

    def reserve_inventory():
        db = postgres_session_factory()
        try:
            buyer = db.get(User, customer_id)
            order = create_order(
                db,
                buyer,
                OrderCreate(items=[{"food_offer_id": offer_id, "quantity": 3}]),
            )
            return order.id
        finally:
            db.close()

    def edit_offer_quantity():
        db = postgres_session_factory()
        try:
            owner = db.get(User, merchant_user_id)
            updated = update_offer(db, owner, offer_id, OfferUpdate(quantity=6))
            return updated.quantity
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        reserve_future = executor.submit(reserve_inventory)
        edit_future = executor.submit(edit_offer_quantity)
        order_id = reserve_future.result()
        updated_quantity = edit_future.result()

    assert updated_quantity == 6

    verify_db = postgres_session_factory()
    try:
        final_offer = verify_db.get(FoodOffer, offer_id)
        from app.db.models.order import Order
        from app.db.models.order_item import OrderItem

        order = verify_db.get(Order, order_id)
        item = verify_db.query(OrderItem).filter(OrderItem.order_id == order_id).one()
        assert item.quantity == 3
        assert final_offer.quantity == 6
        assert final_offer.available_quantity == 3
        assert final_offer.quantity - final_offer.available_quantity == 3
    finally:
        verify_db.close()


def test_order_creation_cannot_commit_after_merchant_is_suspended(postgres_session_factory):
    setup_db = postgres_session_factory()
    try:
        customer = User(
            name="Suspension Race Customer",
            email="pg-suspension-customer@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.CUSTOMER,
        )
        merchant_user = User(
            name="Suspension Race Merchant",
            email="pg-suspension-merchant@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.MERCHANT,
        )
        setup_db.add_all([customer, merchant_user])
        setup_db.commit()

        merchant = Merchant(
            user_id=merchant_user.id,
            business_name="Suspension Race Cafe",
            address="Main St",
            city="Babolsar",
            verification_status="VERIFIED",
        )
        setup_db.add(merchant)
        setup_db.commit()

        offer = FoodOffer(
            merchant_id=merchant.id,
            title="Suspension Race Offer",
            original_price=Decimal("100.00"),
            sale_price=Decimal("50.00"),
            quantity=5,
            available_quantity=5,
            moderation_status="APPROVED",
            pickup_start=datetime.now(timezone.utc),
            pickup_end=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        setup_db.add(offer)
        setup_db.commit()

        customer_id = customer.id
        merchant_id = merchant.id
        offer_id = offer.id
        engine = setup_db.get_bind()
    finally:
        setup_db.close()

    # Hold the merchant row exactly as the admin suspension transaction would.
    admin_db = postgres_session_factory()
    locked_merchant = admin_db.scalar(
        select(Merchant).where(Merchant.id == merchant_id).with_for_update()
    )
    assert locked_merchant is not None

    merchant_lock_requested = Event()

    def observe_merchant_lock(_conn, _cursor, statement, _parameters, _context, _executemany):
        normalized = " ".join(statement.lower().split())
        if "from merchants" in normalized and "for update" in normalized:
            merchant_lock_requested.set()

    sqlalchemy_event.listen(engine, "before_cursor_execute", observe_merchant_lock)

    def attempt_order():
        order_db = postgres_session_factory()
        try:
            buyer = order_db.get(User, customer_id)
            return create_order(
                order_db,
                buyer,
                OrderCreate(items=[{"food_offer_id": offer_id, "quantity": 1}]),
            )
        except HTTPException as exc:
            return exc
        finally:
            order_db.close()

    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(attempt_order)
            assert merchant_lock_requested.wait(timeout=5), "Order request did not reach the merchant lock"

            # This commits while the order request is blocked on the merchant row.
            locked_merchant.verification_status = "SUSPENDED"
            admin_db.commit()

            result = future.result(timeout=10)
        assert isinstance(result, HTTPException)
        assert result.status_code == 409
    finally:
        sqlalchemy_event.remove(engine, "before_cursor_execute", observe_merchant_lock)
        admin_db.close()

    verify_db = postgres_session_factory()
    try:
        final_offer = verify_db.get(FoodOffer, offer_id)
        order_count = verify_db.query(Order).filter(Order.merchant_id == merchant_id).count()
        assert final_offer.available_quantity == 5
        assert order_count == 0
    finally:
        verify_db.close()
