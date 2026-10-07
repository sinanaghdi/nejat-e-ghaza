from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.models.audit_log import AuditLog
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


def _create_users(db):
    admin = User(
        name="Admin",
        email="moderation-admin@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.ADMIN,
    )
    merchant_user = User(
        name="Merchant",
        email="moderation-merchant@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    customer = User(
        name="Customer",
        email="moderation-customer@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    db.add_all([admin, merchant_user, customer])
    db.commit()
    return admin, merchant_user, customer


def test_new_merchant_profile_starts_pending(client, db):
    merchant_user = User(
        name="New Merchant",
        email="new-merchant@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    db.add(merchant_user)
    db.commit()

    token = _login(client, merchant_user.email)
    response = client.post(
        "/api/merchant/profile",
        json={
            "business_name": "کافه جدید",
            "address": "خیابان اصلی",
            "city": "کرمانشاه",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["verification_status"] == "PENDING"


def test_new_offer_starts_pending_and_is_not_public(client, db):
    merchant_user = User(
        name="Offer Merchant",
        email="offer-pending@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    db.add(merchant_user)
    db.commit()
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="کافه پنالتی",
        address="Main",
        city="Kermanshah",
        verification_status="VERIFIED",
    )
    db.add(merchant)
    db.commit()

    token = _login(client, merchant_user.email)
    now = datetime.now(timezone.utc)
    created = client.post(
        "/api/offers",
        json={
            "title": "باکس تست",
            "original_price": "100000",
            "sale_price": "50000",
            "quantity": 2,
            "pickup_start": (now + timedelta(hours=1)).isoformat(),
            "pickup_end": (now + timedelta(hours=3)).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert created.status_code == 201
    assert created.json()["moderation_status"] == "PENDING"
    offer_id = created.json()["id"]

    public = client.get("/api/offers")
    assert public.status_code == 200
    assert all(item["id"] != offer_id for item in public.json())

    direct = client.get(f"/api/offers/{offer_id}")
    assert direct.status_code == 404


def test_admin_can_verify_merchant(client, db):
    admin, merchant_user, _ = _create_users(db)
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Cafe Verify",
        address="Main",
        city="Kermanshah",
        verification_status="PENDING",
    )
    db.add(merchant)
    db.commit()

    admin_token = _login(client, admin.email)
    response = client.patch(
        f"/api/admin/merchants/{merchant.id}/verification",
        json={"status": "VERIFIED"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["verification_status"] == "VERIFIED"

    db.refresh(merchant)
    assert merchant.verification_status == "VERIFIED"
    assert db.query(AuditLog).filter(AuditLog.action == "merchant.verification_changed").count() == 1
    assert db.query(Notification).filter(Notification.user_id == merchant_user.id).count() == 1


def test_merchant_and_customer_cannot_moderate(client, db):
    _, merchant_user, customer = _create_users(db)
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Cafe Lock",
        address="Main",
        city="Kermanshah",
        verification_status="PENDING",
    )
    db.add(merchant)
    db.commit()

    merchant_token = _login(client, merchant_user.email)
    customer_token = _login(client, customer.email)

    path = f"/api/admin/merchants/{merchant.id}/verification"
    payload = {"status": "VERIFIED"}
    assert client.patch(path, json=payload, headers={"Authorization": f"Bearer {merchant_token}"}).status_code == 403
    assert client.patch(path, json=payload, headers={"Authorization": f"Bearer {customer_token}"}).status_code == 403


def test_admin_can_approve_and_reject_offers_with_reason(client, db):
    admin, merchant_user, _ = _create_users(db)
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Cafe Moderate",
        address="Main",
        city="Kermanshah",
        verification_status="VERIFIED",
    )
    db.add(merchant)
    db.commit()

    now = datetime.now(timezone.utc)
    offer = FoodOffer(
        merchant_id=merchant.id,
        title="Pending Box",
        original_price=100000,
        sale_price=50000,
        quantity=3,
        available_quantity=3,
        pickup_start=now + timedelta(hours=1),
        pickup_end=now + timedelta(hours=3),
        moderation_status="PENDING",
    )
    db.add(offer)
    db.commit()

    admin_token = _login(client, admin.email)
    pending = client.get(
        "/api/admin/offers/pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert pending.status_code == 200
    assert pending.json()[0]["id"] == offer.id

    approved = client.patch(
        f"/api/admin/offers/{offer.id}/moderation",
        json={"status": "APPROVED"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approved.status_code == 200
    assert approved.json()["moderation_status"] == "APPROVED"

    public = client.get("/api/offers")
    assert public.status_code == 200
    assert public.json()[0]["id"] == offer.id

    second = FoodOffer(
        merchant_id=merchant.id,
        title="Bad Box",
        original_price=100000,
        sale_price=50000,
        quantity=3,
        available_quantity=3,
        pickup_start=now + timedelta(hours=1),
        pickup_end=now + timedelta(hours=3),
        moderation_status="PENDING",
    )
    db.add(second)
    db.commit()

    rejected = client.patch(
        f"/api/admin/offers/{second.id}/moderation",
        json={"status": "REJECTED", "reason": "تصویر و توضیحات کافی نیست"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["moderation_status"] == "REJECTED"
    assert rejected.json()["moderation_reason"] == "تصویر و توضیحات کافی نیست"


def test_customer_cannot_buy_unapproved_offer(client, db):
    _, merchant_user, customer = _create_users(db)
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Cafe Buy Guard",
        address="Main",
        city="Kermanshah",
        verification_status="VERIFIED",
    )
    db.add(merchant)
    db.commit()

    now = datetime.now(timezone.utc)
    offer = FoodOffer(
        merchant_id=merchant.id,
        title="Hidden Box",
        original_price=100000,
        sale_price=50000,
        quantity=2,
        available_quantity=2,
        pickup_start=now + timedelta(hours=1),
        pickup_end=now + timedelta(hours=3),
        moderation_status="PENDING",
    )
    db.add(offer)
    db.commit()

    customer_token = _login(client, customer.email)
    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert response.status_code == 409
