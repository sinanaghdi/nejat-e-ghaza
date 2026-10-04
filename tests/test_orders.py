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


def _setup_order(db):
    customer = User(
        name="Customer",
        email="customer-status@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    merchant_user = User(
        name="Merchant",
        email="merchant-status@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.MERCHANT,
    )
    db.add_all([customer, merchant_user])
    db.commit()
    merchant = Merchant(
        user_id=merchant_user.id,
        business_name="Cafe",
        address="Main St",
        city="Babolsar",
    )
    db.add(merchant)
    db.commit()
    offer = FoodOffer(
        merchant_id=merchant.id,
        title="Food Box",
        original_price=Decimal("100.00"),
        sale_price=Decimal("50.00"),
        quantity=2,
        available_quantity=2,
        pickup_start=datetime.now(timezone.utc),
        pickup_end=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    db.add(offer)
    db.commit()
    return customer, merchant_user, merchant, offer


def _login(client, email):
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": "password123"},
    ).json()["access_token"]


def test_customer_cannot_mark_order_as_paid(client, db):
    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = response.json()["id"]

    response = client.patch(
        f"/api/orders/{order_id}/status",
        json={"status": "PAID"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_merchant_cannot_mark_order_as_paid(client, db):
    customer, merchant_user, _, offer = _setup_order(db)
    customer_token = _login(client, customer.email)
    merchant_token = _login(client, merchant_user.email)

    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    order_id = response.json()["id"]

    response = client.patch(
        f"/api/orders/{order_id}/status",
        json={"status": "PAID"},
        headers={"Authorization": f"Bearer {merchant_token}"},
    )

    assert response.status_code == 403


def test_merchant_can_move_paid_order_to_ready_for_pickup(client, db):
    customer, merchant_user, _, offer = _setup_order(db)
    customer_token = _login(client, customer.email)
    merchant_token = _login(client, merchant_user.email)

    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    order_id = response.json()["id"]

    # Simulate a verified payment provider callback at the service/domain layer.
    from app.db.models.order import Order
    from app.models.enums import OrderStatus
    order = db.get(Order, order_id)
    order.status = OrderStatus.PAID
    db.commit()

    response = client.patch(
        f"/api/orders/{order_id}/status",
        json={"status": "READY_FOR_PICKUP"},
        headers={"Authorization": f"Bearer {merchant_token}"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "READY_FOR_PICKUP"


def test_merchant_cannot_complete_unpaid_order(client, db):
    customer, merchant_user, _, offer = _setup_order(db)
    customer_token = _login(client, customer.email)
    merchant_token = _login(client, merchant_user.email)

    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    order_id = response.json()["id"]

    response = client.patch(
        f"/api/orders/{order_id}/status",
        json={"status": "COMPLETED"},
        headers={"Authorization": f"Bearer {merchant_token}"},
    )

    assert response.status_code == 403


def test_cancelling_pending_order_restores_inventory(client, db):
    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = response.json()["id"]

    db.refresh(offer)
    assert offer.available_quantity == 1

    response = client.patch(
        f"/api/orders/{order_id}/status",
        json={"status": "CANCELLED"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    db.refresh(offer)
    assert offer.available_quantity == 2


def test_paid_order_cannot_be_cancelled_through_status_endpoint(client, db):
    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = response.json()["id"]

    from app.db.models.order import Order
    from app.models.enums import OrderStatus
    order = db.get(Order, order_id)
    order.status = OrderStatus.PAID
    db.commit()

    response = client.patch(
        f"/api/orders/{order_id}/status",
        json={"status": "CANCELLED"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_customer_can_create_payment_for_pending_order(client, db):
    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    order_response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = order_response.json()["id"]

    response = client.post(
        f"/api/payments/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["payment"]["status"] == "PENDING"
    assert response.json()["payment"]["order_id"] == order_id
    assert response.json()["payment"]["provider"] == "mock"


def test_payment_webhook_moves_order_to_paid(client, db):
    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    order_response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = order_response.json()["id"]

    payment_response = client.post(
        f"/api/payments/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    authority = payment_response.json()["payment"]["authority"]

    webhook_response = client.post(
        "/api/payments/webhook",
        json={"authority": authority},
        headers={"X-Webhook-Secret": "change-me"},
    )

    assert webhook_response.status_code == 200
    assert webhook_response.json()["status"] == "PAID"

    from app.db.models.order import Order
    from app.models.enums import OrderStatus
    order = db.get(Order, order_id)
    assert order.status == OrderStatus.PAID


def test_payment_webhook_is_idempotent(client, db):
    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    order_response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = order_response.json()["id"]

    payment_response = client.post(
        f"/api/payments/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    authority = payment_response.json()["payment"]["authority"]

    first = client.post("/api/payments/webhook", json={"authority": authority}, headers={"X-Webhook-Secret": "change-me"})
    second = client.post("/api/payments/webhook", json={"authority": authority}, headers={"X-Webhook-Secret": "change-me"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["payment"]["reference_id"] == second.json()["payment"]["reference_id"]


def test_customer_cannot_create_payment_for_another_customer_order(client, db):
    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    order_response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = order_response.json()["id"]

    other = User(
        name="Other Customer",
        email="other-payment@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.CUSTOMER,
    )
    db.add(other)
    db.commit()

    other_token = _login(client, other.email)
    response = client.post(
        f"/api/payments/orders/{order_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    assert response.status_code == 403


def test_order_creation_writes_audit_log(client, db):
    from app.db.models.audit_log import AuditLog

    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}", "X-Request-ID": "test-request-123"},
    )

    assert response.status_code == 201
    order_id = response.json()["id"]

    event = (
        db.query(AuditLog)
        .filter(AuditLog.action == "order.created", AuditLog.entity_id == str(order_id))
        .one()
    )
    assert event.actor_user_id == customer.id
    assert event.request_id == "test-request-123"
    assert event.success is True


def test_create_payment_is_idempotent(client, db):
    customer, _, _, offer = _setup_order(db)
    token = _login(client, customer.email)

    order_response = client.post(
        "/api/orders",
        json={"items": [{"food_offer_id": offer.id, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = order_response.json()["id"]

    first = client.post(
        f"/api/payments/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    second = client.post(
        f"/api/payments/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["payment"]["id"] == second.json()["payment"]["id"]
    assert first.json()["payment"]["authority"] == second.json()["payment"]["authority"]
