from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.order import Order
from app.db.models.payment import Payment
from app.db.models.user import User
from app.models.enums import OrderStatus, UserRole
from app.repositories import order as order_repository
from app.services.payment_provider import (
    PaymentRequest,
    get_payment_provider,
)


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
    result = provider.start(
        PaymentRequest(amount=order.total_amount, order_id=order.id)
    )

    payment = Payment(
        order_id=order.id,
        provider=provider.name,
        authority=result.authority,
        amount=order.total_amount,
        status="PENDING",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def verify_payment(db: Session, authority: str) -> Payment:
    payment = db.scalar(select(Payment).where(Payment.authority == authority).with_for_update())
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status == "PAID":
        return payment

    provider = get_payment_provider()
    result = provider.verify(authority, payment.amount)

    if not result.success:
        payment.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")

    order = db.get(Order, payment.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=409, detail="Order is no longer payable")

    payment.status = "PAID"
    payment.reference_id = result.reference_id
    payment.paid_at = datetime.now(timezone.utc)
    order.status = OrderStatus.PAID

    db.commit()
    db.refresh(payment)
    return payment
