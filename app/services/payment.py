from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.request_context import get_request_id
from app.db.models.order import Order
from app.db.models.payment import Payment
from app.db.models.user import User
from app.models.enums import OrderStatus, UserRole
from app.services.audit import record_event
from app.services.payment_provider import PaymentRequest, get_payment_provider


def create_payment(db: Session, user: User, order_id: int) -> Payment:
    if user.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Customer access required")

    order = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.customer_id != user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this order")
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=409, detail="Only pending orders can be paid")
    if order.payment:
        return order.payment

    provider = get_payment_provider()
    try:
        result = provider.start(PaymentRequest(amount=order.total_amount, order_id=order.id))
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail="Payment provider is temporarily unavailable") from exc
    payment = Payment(
        order_id=order.id,
        provider=provider.name,
        authority=result.authority,
        amount=order.total_amount,
        status="PENDING",
    )
    db.add(payment)
    record_event(
        db,
        action="payment.created",
        entity_type="payment",
        entity_id=order_id,
        actor=user,
        request_id=get_request_id(),
        details={"provider": provider.name, "amount": str(order.total_amount)},
    )
    db.commit()
    db.refresh(payment)
    return payment


def verify_payment(db: Session, authority: str, expected_order_id: int | None = None) -> Payment:
    payment = db.scalar(select(Payment).where(Payment.authority == authority).with_for_update())
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if expected_order_id is not None and payment.order_id != expected_order_id:
        raise HTTPException(status_code=400, detail="Payment does not belong to this order")
    if payment.status == "PAID":
        return payment

    provider = get_payment_provider()
    try:
        result = provider.verify(authority, payment.amount)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail="Payment provider is temporarily unavailable") from exc
    if not result.success:
        payment.status = "FAILED"
        record_event(
            db,
            action="payment.failed",
            entity_type="payment",
            entity_id=payment.id,
            request_id=get_request_id(),
            success=False,
        )
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")

    order = db.scalar(select(Order).where(Order.id == payment.order_id).with_for_update())
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=409, detail="Order is no longer payable")

    payment.status = "PAID"
    payment.reference_id = result.reference_id
    payment.paid_at = datetime.now(timezone.utc)
    order.status = OrderStatus.PAID
    record_event(
        db,
        action="payment.verified",
        entity_type="payment",
        entity_id=payment.id,
        request_id=get_request_id(),
        details={"order_id": order.id, "reference_id": result.reference_id},
    )
    db.commit()
    db.refresh(payment)
    return payment
