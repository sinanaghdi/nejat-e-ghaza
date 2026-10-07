from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.models.food_offer import FoodOffer
from app.db.models.order import Order
from app.db.models.order_item import OrderItem
from app.db.models.payment import Payment
from app.db.models.user import User
from app.core.request_context import get_request_id
from app.services.audit import record_event
from app.services.notification import create_notification
from app.models.enums import OrderStatus, UserRole
from app.repositories import order as order_repository
from app.schemas.order import OrderCreate
import secrets


def _as_utc(value: datetime) -> datetime:
    """Normalize database datetimes to timezone-aware UTC for comparisons."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)

ALLOWED_STATUS_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.EXPIRED},
    OrderStatus.PAID: {OrderStatus.READY_FOR_PICKUP},
    OrderStatus.READY_FOR_PICKUP: {OrderStatus.COMPLETED, OrderStatus.EXPIRED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
    OrderStatus.EXPIRED: set(),
}

CUSTOMER_ALLOWED_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.CANCELLED},
}

MERCHANT_ALLOWED_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.CANCELLED},
    OrderStatus.PAID: {OrderStatus.READY_FOR_PICKUP},
}

def _assert_actor_can_transition(user: User, order: Order, new_status: OrderStatus) -> None:
    if user.role == UserRole.CUSTOMER:
        if order.customer_id != user.id:
            raise HTTPException(status_code=403, detail="You do not have access to this order")
        allowed = CUSTOMER_ALLOWED_TRANSITIONS.get(order.status, set())
    elif user.role == UserRole.MERCHANT:
        if not order.merchant or order.merchant.user_id != user.id:
            raise HTTPException(status_code=403, detail="You do not own this order")
        allowed = MERCHANT_ALLOWED_TRANSITIONS.get(order.status, set())
    elif user.role == UserRole.ADMIN:
        allowed = ALLOWED_STATUS_TRANSITIONS.get(order.status, set())
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if new_status not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Role {user.role} cannot change {order.status} to {new_status}",
        )


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
            if offer.moderation_status != "APPROVED":
                raise HTTPException(status_code=409, detail=f"Food offer {offer.id} is not approved")
            if not offer.merchant or offer.merchant.verification_status != "VERIFIED":
                raise HTTPException(status_code=409, detail=f"Merchant for food offer {offer.id} is not verified")
            if _as_utc(offer.pickup_end) <= datetime.now(timezone.utc):
                raise HTTPException(status_code=409, detail=f"Food offer {offer.id} has expired")
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
        db.flush()
        create_notification(
            db,
            user_id=user.id,
            title="سفارش ثبت شد",
            body=f"سفارش #{order.id} با موفقیت ثبت شد و در انتظار پرداخت است.",
            notification_type="ORDER",
            entity_type="order",
            entity_id=order.id,
        )
        if order.merchant:
            create_notification(
                db,
                user_id=order.merchant.user_id,
                title="سفارش جدید",
                body=f"سفارش #{order.id} برای فروشگاه شما ثبت شد.",
                notification_type="ORDER",
                entity_type="order",
                entity_id=order.id,
            )
        record_event(
            db,
            action="order.created",
            entity_type="order",
            entity_id=order.id,
            actor=user,
            request_id=get_request_id(),
            details={"total_amount": str(total), "merchant_id": merchant_id},
        )
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

def list_merchant_orders(db: Session, user: User) -> list[Order]:
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=403, detail="Merchant access required")
    from app.repositories.merchant import get_by_user_id
    merchant = get_by_user_id(db, user.id)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    return order_repository.list_by_merchant(db, merchant.id)


def update_order_status(db: Session, user: User, order_id: int, new_status: OrderStatus) -> Order:
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .with_for_update()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    _assert_actor_can_transition(user, order, new_status)

    try:
        if new_status == OrderStatus.CANCELLED:
            for item in order.items:
                offer = db.scalar(
                    select(FoodOffer)
                    .where(FoodOffer.id == item.food_offer_id)
                    .with_for_update()
                )
                if offer:
                    offer.available_quantity += item.quantity

        order.status = new_status
        status_message = {
            OrderStatus.CANCELLED: ("سفارش لغو شد", f"سفارش #{order.id} لغو شد."),
            OrderStatus.READY_FOR_PICKUP: ("سفارش آماده دریافت است", f"سفارش #{order.id} اکنون آماده دریافت است."),
            OrderStatus.COMPLETED: ("سفارش تحویل شد", f"سفارش #{order.id} با موفقیت تحویل شد."),
            OrderStatus.EXPIRED: ("سفارش منقضی شد", f"سفارش #{order.id} به دلیل پایان مهلت منقضی شد."),
        }.get(new_status)
        if status_message:
            create_notification(
                db,
                user_id=order.customer_id,
                title=status_message[0],
                body=status_message[1],
                notification_type="ORDER",
                entity_type="order",
                entity_id=order.id,
            )
        record_event(
            db,
            action="order.status_changed",
            entity_type="order",
            entity_id=order.id,
            actor=user,
            request_id=get_request_id(),
            details={"new_status": new_status.value},
        )
        db.commit()
        db.refresh(order)
        return order
    except Exception:
        db.rollback()
        raise


def expire_pending_orders(db: Session) -> int:
    from datetime import datetime, timedelta, timezone
    from app.core.config import settings

    cutoff = datetime.now(timezone.utc) - timedelta(
        minutes=settings.order_payment_timeout_minutes
    )

    try:
        orders = list(
            db.scalars(
                select(Order)
                .where(
                    Order.status == OrderStatus.PENDING,
                    Order.created_at <= cutoff,
                )
                .order_by(Order.id)
                .with_for_update()
            ).all()
        )

        expired_count = 0
        for order in orders:
            # Keep the same Order -> Payment lock ordering used by payment
            # verification. A paid order must never be expired after gateway
            # verification has succeeded.
            payment = db.scalar(
                select(Payment)
                .where(Payment.order_id == order.id)
                .with_for_update()
            )
            if payment and payment.status == "PAID":
                # Defensive reconciliation for an interrupted transaction from
                # an older deployment: a paid payment is authoritative.
                order.status = OrderStatus.PAID
                continue

            for item in order.items:
                offer = db.scalar(
                    select(FoodOffer)
                    .where(FoodOffer.id == item.food_offer_id)
                    .with_for_update()
                )
                if offer:
                    offer.available_quantity += item.quantity

            order.status = OrderStatus.EXPIRED
            create_notification(
                db,
                user_id=order.customer_id,
                title="سفارش منقضی شد",
                body=f"سفارش #{order.id} منقضی شد و موجودی آن آزاد شد.",
                notification_type="ORDER",
                entity_type="order",
                entity_id=order.id,
            )
            record_event(
                db,
                action="order.expired",
                entity_type="order",
                entity_id=order.id,
                request_id=get_request_id(),
            )
            expired_count += 1

        db.commit()
        return expired_count
    except Exception:
        db.rollback()
        raise


def verify_pickup_code(db: Session, user: User, order_id: int, pickup_code: str) -> Order:
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=403, detail="Merchant access required")

    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .with_for_update()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order.merchant or order.merchant.user_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this order")
    if order.status != OrderStatus.READY_FOR_PICKUP:
        raise HTTPException(status_code=409, detail="Order is not ready for pickup")

    if not secrets.compare_digest(order.pickup_code, pickup_code.strip()):
        raise HTTPException(status_code=403, detail="Invalid pickup code")

    try:
        order.status = OrderStatus.COMPLETED
        record_event(
            db,
            action="order.pickup_verified",
            entity_type="order",
            entity_id=order.id,
            actor=user,
            request_id=get_request_id(),
            details={"order_id": order.id},
        )
        db.commit()
        db.refresh(order)
        return order
    except Exception:
        db.rollback()
        raise
