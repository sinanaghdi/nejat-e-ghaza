from app.db.models.user import User
from app.models.enums import UserRole
from app.core.security import hash_password

def test_admin_can_promote_customer_to_merchant(client, db):
    admin=User(name="Admin",email="admin@example.com",password_hash=hash_password("password123"),role=UserRole.ADMIN)
    customer=User(name="Customer",email="customer@example.com",password_hash=hash_password("password123"),role=UserRole.CUSTOMER)
    db.add_all([admin, customer]); db.commit()
    token=client.post("/api/auth/login",json={"email":"admin@example.com","password":"password123"}).json()["access_token"]
    response=client.patch(f"/api/admin/users/{customer.id}/role",json={"role":"MERCHANT"},headers={"Authorization":f"Bearer {token}"})
    assert response.status_code==200
    assert response.json()["role"]=="MERCHANT"

def test_customer_cannot_access_admin_endpoints(client, db):
    customer=User(name="Customer",email="customer@example.com",password_hash=hash_password("password123"),role=UserRole.CUSTOMER)
    db.add(customer); db.commit()
    token=client.post("/api/auth/login",json={"email":"customer@example.com","password":"password123"}).json()["access_token"]
    response=client.get("/api/admin/users",headers={"Authorization":f"Bearer {token}"})
    assert response.status_code==403
