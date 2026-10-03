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
