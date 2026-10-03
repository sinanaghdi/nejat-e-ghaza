from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.models.food_offer import FoodOffer
from app.db.models.order import Order
from app.db.models.order_item import OrderItem
from app.db.models.user import User
from app.models.enums import OrderStatus, UserRole
from app.repositories import order as order_repository
from app.schemas.order import OrderCreate
import secrets

ALLOWED_STATUS_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.EXPIRED},
    OrderStatus.PAID: {OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED},
    OrderStatus.READY_FOR_PICKUP: {OrderStatus.COMPLETED, OrderStatus.EXPIRED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
    OrderStatus.EXPIRED: set(),
}

def create_order(db: Session, user: User, payload: OrderCreate) -> Order:
    if user.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Customer access required")
    ids = [item.food_offer_id for item in payload.items]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=422, detail="Each food offer may appear only once per order")
    try:
        offers = list(db.scalars(select(FoodOffer).where(FoodOffer.id.in_(ids)).order_by(FoodOffer.id).with_for_update()).all())
        by_id = {offer.id: offer for offer in offers}
        if len(by_id) != len(ids):
            raise HTTPException(status_code=404, detail="One or more food offers were not found")
        merchant_id = None
        total = 0
        items = []
        for requested in payload.items:
            offer = by_id[requested.food_offer_id]
            if not offer.is_active:
                raise HTTPException(status_code=409, detail=f"Food offer {offer.id} is inactive")
            if offer.available_quantity < requested.quantity:
                raise HTTPException(status_code=409, detail=f"Insufficient inventory for food offer {offer.id}")
            if merchant_id is None:
                merchant_id = offer.merchant_id
            elif merchant_id != offer.merchant_id:
                raise HTTPException(status_code=422, detail="All food offers must belong to the same merchant")
            subtotal = offer.sale_price * requested.quantity
            total += subtotal
            offer.available_quantity -= requested.quantity
            items.append(OrderItem(food_offer_id=offer.id, quantity=requested.quantity, unit_price=offer.sale_price, subtotal=subtotal))
        order = Order(customer_id=user.id, merchant_id=merchant_id, total_amount=total, status=OrderStatus.PENDING, pickup_code=secrets.token_hex(4).upper(), items=items)
        db.add(order)
        db.commit()
        db.refresh(order)
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

def get_customer_order(db: Session, user: User, order_id: int) -> Order:
    order = order_repository.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.customer_id != user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this order")
    return order

def list_customer_orders(db: Session, user: User) -> list[Order]:
    if user.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Customer access required")
    return order_repository.list_by_customer(db, user.id)

def update_order_status(db: Session, user: User, order_id: int, new_status: OrderStatus) -> Order:
    order = order_repository.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user.role == UserRole.CUSTOMER and order.customer_id != user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this order")
    if user.role not in {UserRole.CUSTOMER, UserRole.MERCHANT, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if user.role == UserRole.CUSTOMER and new_status not in {OrderStatus.CANCELLED}:
        raise HTTPException(status_code=403, detail="Customer can only cancel an order")
    if user.role == UserRole.MERCHANT and order.merchant.user_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this order")
    if new_status not in ALLOWED_STATUS_TRANSITIONS[order.status]:
        raise HTTPException(status_code=409, detail=f"Invalid order status transition: {order.status} -> {new_status}")

    order.status = new_status
    db.commit()
    db.refresh(order)
    return order
