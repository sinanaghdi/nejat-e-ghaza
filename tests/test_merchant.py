from app.db.models.merchant import Merchant
from app.db.models.user import User
from app.models.enums import UserRole
from app.core.security import hash_password


def test_merchant_can_update_profile(client, db):
    merchant_user = User(
        name="Merchant",
        email="merchant-profile@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    db.add(merchant_user)
    db.commit()

    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Cafe Old",
        description="Old",
        address="Old Address",
        city="Babolsar",
    )
    db.add(merchant)
    db.commit()

    token = client.post(
        "/api/auth/login",
        json={"email": merchant_user.email, "password": "password123"},
    ).json()["access_token"]

    response = client.patch(
        "/api/merchant/profile",
        json={
            "business_name": "Cafe New",
            "description": "Updated",
            "address": "New Address",
            "city": "Kermanshah",
            "latitude": 34.32,
            "longitude": 47.08,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["business_name"] == "Cafe New"
    assert response.json()["latitude"] == 34.32


def test_customer_cannot_update_merchant_profile(client, db):
    response = client.post(
        "/api/auth/register",
        json={"name": "Customer", "email": "customer-profile@example.com", "password": "password123"},
    )
    assert response.status_code == 201

    token = client.post(
        "/api/auth/login",
        json={"email": "customer-profile@example.com", "password": "password123"},
    ).json()["access_token"]

    response = client.patch(
        "/api/merchant/profile",
        json={
            "business_name": "Nope",
            "description": None,
            "address": "Somewhere",
            "city": "Kermanshah",
            "latitude": None,
            "longitude": None,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
