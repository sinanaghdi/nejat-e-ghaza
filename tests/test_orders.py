from decimal import Decimal
from datetime import datetime, timedelta, timezone
from app.db.models.user import User
from app.db.models.merchant import Merchant
from app.db.models.food_offer import FoodOffer
from app.models.enums import UserRole
from app.core.security import hash_password

def test_order_reduces_inventory(client, db):
    customer=User(name="Customer",email="customer@example.com",password_hash=hash_password("password123"),role=UserRole.CUSTOMER)
    merchant_user=User(name="Merchant",email="merchant@example.com",password_hash=hash_password("password123"),role=UserRole.MERCHANT)
    db.add_all([customer,merchant_user]); db.commit()
    merchant=Merchant(user_id=merchant_user.id,business_name="Cafe",address="Main St",city="Babolsar")
    db.add(merchant); db.commit()
    offer=FoodOffer(merchant_id=merchant.id,title="Food Box",original_price=Decimal("100.00"),sale_price=Decimal("50.00"),quantity=3,available_quantity=3,pickup_start=datetime.now(timezone.utc),pickup_end=datetime.now(timezone.utc)+timedelta(hours=2))
    db.add(offer); db.commit()
    token=client.post("/api/auth/login",json={"email":"customer@example.com","password":"password123"}).json()["access_token"]
    response=client.post("/api/orders",json={"items":[{"food_offer_id":offer.id,"quantity":2}]},headers={"Authorization":f"Bearer {token}"})
    assert response.status_code==201
    db.refresh(offer)
    assert offer.available_quantity==1
    assert response.json()["total_amount"]=="100.00"

def test_order_rejects_insufficient_inventory(client, db):
    customer=User(name="Customer",email="customer@example.com",password_hash=hash_password("password123"),role=UserRole.CUSTOMER)
    merchant_user=User(name="Merchant",email="merchant@example.com",password_hash=hash_password("password123"),role=UserRole.MERCHANT)
    db.add_all([customer,merchant_user]); db.commit()
    merchant=Merchant(user_id=merchant_user.id,business_name="Cafe",address="Main St",city="Babolsar")
    db.add(merchant); db.commit()
    offer=FoodOffer(merchant_id=merchant.id,title="Food Box",original_price=Decimal("100.00"),sale_price=Decimal("50.00"),quantity=1,available_quantity=1,pickup_start=datetime.now(timezone.utc),pickup_end=datetime.now(timezone.utc)+timedelta(hours=2))
    db.add(offer); db.commit()
    token=client.post("/api/auth/login",json={"email":"customer@example.com","password":"password123"}).json()["access_token"]
    response=client.post("/api/orders",json={"items":[{"food_offer_id":offer.id,"quantity":2}]},headers={"Authorization":f"Bearer {token}"})
    assert response.status_code==409
