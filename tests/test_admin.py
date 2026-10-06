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

def test_admin_can_list_orders(client, db):
    from app.db.models.merchant import Merchant
    from app.db.models.food_offer import FoodOffer

    admin = User(
        name="Admin",
        email="admin-orders@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.ADMIN,
    )
    customer = User(
        name="Customer",
        email="customer-orders@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    merchant_user = User(
        name="Merchant",
        email="merchant-orders@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    db.add_all([admin, customer, merchant_user])
    db.commit()

    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Cafe",
        address="Main",
        city="Kermanshah",
    )
    db.add(merchant)
    db.commit()

    token = client.post(
        "/api/auth/login",
        json={"email": "admin-orders@example.com", "password": "password123"},
    ).json()["access_token"]

    from app.db.models.order import Order
    order = Order(
        customer_id=customer.id,
        merchant_id=merchant.id,
        total_amount=50000,
        status="PENDING",
        pickup_code="ABCD1234",
    )
    db.add(order)
    db.commit()

    response = client.get(
        "/api/admin/orders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()[0]["id"] == order.id


def test_customer_cannot_list_admin_orders(client, db):
    response = client.post(
        "/api/auth/register",
        json={"name": "Customer", "email": "customer-admin-orders@example.com", "password": "password123"},
    )
    assert response.status_code == 201
    token = client.post(
        "/api/auth/login",
        json={"email": "customer-admin-orders@example.com", "password": "password123"},
    ).json()["access_token"]

    response = client.get(
        "/api/admin/orders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
