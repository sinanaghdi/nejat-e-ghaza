from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.models.food_offer import FoodOffer
from app.db.models.merchant import Merchant
from app.db.models.notification import Notification
from app.db.models.user import User
from app.models.enums import UserRole


def _login(client, email):
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": "password123"},
    ).json()["access_token"]


def test_notification_list_and_mark_read(client, db):
    user = User(
        name="Notification Customer",
        email="notification-customer@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    db.add(user)
    db.commit()
    db.add(Notification(
        user_id=user.id,
        title="اعلان تست",
        body="پیام تست",
        notification_type="INFO",
    ))
    db.commit()

    token = _login(client, user.email)
    response = client.get("/api/notifications", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["unread_count"] == 1
    notification_id = response.json()["items"][0]["id"]

    read = client.patch(
        f"/api/notifications/{notification_id}/read",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert read.status_code == 200
    assert read.json()["is_read"] is True


def test_mark_all_notifications_read(client, db):
    user = User(
        name="Notification Customer",
        email="notification-all@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    db.add(user)
    db.commit()
    db.add_all([
        Notification(user_id=user.id, title="۱", body="۱"),
        Notification(user_id=user.id, title="۲", body="۲"),
    ])
    db.commit()

    token = _login(client, user.email)
    response = client.post(
        "/api/notifications/read-all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["updated_count"] == 2


def test_order_creation_creates_notifications_for_customer_and_merchant(client, db):
    customer = User(
        name="Customer",
        email="notification-order-customer@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    merchant_user = User(
        name="Merchant",
        email="notification-order-merchant@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    db.add_all([customer, merchant_user])
    db.commit()

    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Notification Cafe",
        address="Main St",
        city="Babolsar",
    )
    db.add(merchant)
    db.commit()

    offer = FoodOffer(
        merchant_id=merchant.id,
        title="Food Box",
        original_price=100,
        sale_price=50,
        quantity=2,
        available_quantity=2,
        pickup_start=datetime.now(timezone.utc),
        pickup_end=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    db.add(offer)
    db.commit()

    token = _login(client, customer.email)
    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201

    assert db.query(Notification).filter(Notification.user_id == customer.id).count() == 1
    assert db.query(Notification).filter(Notification.user_id == merchant_user.id).count() == 1
