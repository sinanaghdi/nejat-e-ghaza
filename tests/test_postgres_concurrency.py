import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models.food_offer import FoodOffer
from app.db.models.merchant import Merchant
from app.db.models.user import User
from app.models.enums import UserRole
from app.schemas.order import OrderCreate
from app.services.order import create_order
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
