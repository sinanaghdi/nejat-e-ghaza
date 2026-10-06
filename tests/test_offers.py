from datetime import datetime, timedelta, timezone
from sqlalchemy import update
from app.db.models.user import User
from app.models.enums import UserRole
from app.core.security import hash_password

def make_merchant(db, user_id=1):
    user = User(id=user_id, name="Merchant", email=f"merchant{user_id}@example.com", password_hash=hash_password("password123"), role=UserRole.MERCHANT)
    db.add(user); db.commit()
    return user

def test_customer_cannot_create_offer(client, db):
    response = client.post("/api/auth/register", json={"name":"Ali","email":"ali@example.com","password":"password123"})
    token = client.post("/api/auth/login", json={"email":"ali@example.com","password":"password123"}).json()["access_token"]
    payload={"title":"Pizza Box","original_price":"100.00","sale_price":"50.00","quantity":5,"pickup_start":(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat(),"pickup_end":(datetime.now(timezone.utc)+timedelta(hours=3)).isoformat()}
    assert client.post("/api/offers", json=payload, headers={"Authorization":f"Bearer {token}"}).status_code == 403


def test_public_offer_search_and_city_filter(client, db):
    from app.db.models.merchant import Merchant
    from app.db.models.food_offer import FoodOffer

    merchant_user = make_merchant(db, user_id=10)
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="کافه سبز",
        description="کافه محلی",
        address="خیابان اصلی",
        city="کرمانشاه",
    )
    db.add(merchant)
    db.commit()

    now = datetime.now(timezone.utc)
    db.add_all([
        FoodOffer(
            merchant_id=merchant.id,
            title="باکس شام",
            description="غذای تازه",
            original_price=200000,
            sale_price=100000,
            quantity=5,
            available_quantity=5,
            pickup_start=now + timedelta(hours=1),
            pickup_end=now + timedelta(hours=3),
            is_active=True,
        ),
        FoodOffer(
            merchant_id=merchant.id,
            title="ساندویچ",
            description="غذای دیگر",
            original_price=150000,
            sale_price=120000,
            quantity=3,
            available_quantity=3,
            pickup_start=now + timedelta(hours=1),
            pickup_end=now + timedelta(hours=3),
            is_active=True,
        ),
    ])
    db.commit()

    response = client.get("/api/offers", params={"query": "باکس", "city": "کرمانشاه"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "باکس شام"
    assert data[0]["merchant"]["business_name"] == "کافه سبز"
    assert data[0]["merchant"]["city"] == "کرمانشاه"

    response = client.get("/api/offers", params={"sort": "price_asc"})
    assert response.status_code == 200
    assert [item["sale_price"] for item in response.json()] == ["100000.00", "120000.00"]


def test_offer_price_range_validation(client):
    response = client.get("/api/offers", params={"min_price": 200000, "max_price": 100000})
    assert response.status_code == 422


def test_nearby_offer_sort_requires_coordinates(client):
    response = client.get("/api/offers", params={"sort": "distance"})
    assert response.status_code == 422


def test_nearby_offer_requires_coordinate_pair(client):
    response = client.get("/api/offers", params={"latitude": 34.3})
    assert response.status_code == 422

def test_expired_offer_is_not_publicly_listed(client, db):
    from app.db.models.merchant import Merchant
    from app.db.models.food_offer import FoodOffer

    merchant_user = make_merchant(db, user_id=20)
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="کافه قدیمی",
        address="خیابان اصلی",
        city="کرمانشاه",
    )
    db.add(merchant)
    db.commit()

    now = datetime.now(timezone.utc)
    db.add(
        FoodOffer(
            merchant_id=merchant.id,
            title="پیشنهاد منقضی",
            original_price=100000,
            sale_price=50000,
            quantity=2,
            available_quantity=2,
            pickup_start=now - timedelta(hours=2),
            pickup_end=now - timedelta(minutes=1),
            is_active=True,
        )
    )
    db.commit()

    response = client.get("/api/offers")
    assert response.status_code == 200
    assert all(item["title"] != "پیشنهاد منقضی" for item in response.json())

def test_merchant_can_update_own_offer(client, db):
    from app.db.models.merchant import Merchant
    from app.db.models.food_offer import FoodOffer
    from datetime import datetime, timedelta, timezone

    merchant_user = make_merchant(db, user_id=30)
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="کافه ویرایش",
        address="خیابان اصلی",
        city="کرمانشاه",
    )
    db.add(merchant)
    db.commit()

    now = datetime.now(timezone.utc)
    offer = FoodOffer(
        merchant_id=merchant.id,
        title="باکس قدیمی",
        original_price=200000,
        sale_price=100000,
        quantity=5,
        available_quantity=5,
        pickup_start=now + timedelta(hours=1),
        pickup_end=now + timedelta(hours=3),
    )
    db.add(offer)
    db.commit()

    token = client.post(
        "/api/auth/login",
        json={"email": merchant_user.email, "password": "password123"},
    ).json()["access_token"]

    response = client.patch(
        f"/api/offers/{offer.id}",
        json={
            "title": "باکس جدید",
            "description": "تازه شد",
            "original_price": "220000",
            "sale_price": "110000",
            "quantity": 4,
            "available_quantity": 4,
            "pickup_start": (now + timedelta(hours=2)).isoformat(),
            "pickup_end": (now + timedelta(hours=4)).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "باکس جدید"
    assert response.json()["available_quantity"] == 4


def test_merchant_cannot_update_other_merchants_offer(client, db):
    from app.db.models.merchant import Merchant
    from app.db.models.food_offer import FoodOffer
    from datetime import datetime, timedelta, timezone

    merchant_one = make_merchant(db, user_id=31)
    merchant_two_user = make_merchant(db, user_id=32)

    merchant_two = Merchant(
        user_id=merchant_two_user.id,
        business_name="کافه دوم",
        address="خیابان دوم",
        city="کرمانشاه",
    )
    db.add(merchant_two)
    db.commit()

    now = datetime.now(timezone.utc)
    offer = FoodOffer(
        merchant_id=merchant_two.id,
        title="غذای دوم",
        original_price=100000,
        sale_price=50000,
        quantity=2,
        available_quantity=2,
        pickup_start=now + timedelta(hours=1),
        pickup_end=now + timedelta(hours=3),
    )
    db.add(offer)
    db.commit()

    token = client.post(
        "/api/auth/login",
        json={"email": merchant_one.email, "password": "password123"},
    ).json()["access_token"]

    response = client.patch(
        f"/api/offers/{offer.id}",
        json={"title": "نباید تغییر کند"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403

def test_merchant_cannot_restore_sold_inventory(client, db):
    from app.db.models.merchant import Merchant
    from app.db.models.food_offer import FoodOffer
    from datetime import datetime, timedelta, timezone

    merchant_user = make_merchant(db, user_id=33)
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="کافه موجودی",
        address="خیابان اصلی",
        city="کرمانشاه",
    )
    db.add(merchant)
    db.commit()

    now = datetime.now(timezone.utc)
    offer = FoodOffer(
        merchant_id=merchant.id,
        title="باکس محدود",
        original_price=200000,
        sale_price=100000,
        quantity=5,
        available_quantity=2,
        pickup_start=now + timedelta(hours=1),
        pickup_end=now + timedelta(hours=3),
    )
    db.add(offer)
    db.commit()

    token = client.post(
        "/api/auth/login",
        json={"email": merchant_user.email, "password": "password123"},
    ).json()["access_token"]

    response = client.patch(
        f"/api/offers/{offer.id}",
        json={"quantity": 5, "available_quantity": 5},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
    assert "unsold inventory" in response.json()["detail"]
