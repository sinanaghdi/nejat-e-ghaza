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
from app.services.notification import create_notification
from app.services.settlement import ensure_settlement_for_payment
from app.services.payment_provider import PaymentRequest, get_payment_provider


CLOSED_ORDER_STATUSES = {OrderStatus.CANCELLED, OrderStatus.EXPIRED}


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
    provider = get_payment_provider()
    existing_payment = order.payment

    if existing_payment and existing_payment.status != "FAILED":
        # A deployment may change provider configuration while unpaid orders
        # still have an active payment attempt. Never return an old authority
        # for a checkout URL generated from a different provider configuration.
        if existing_payment.provider != provider.name:
            raise HTTPException(
                status_code=409,
                detail="Payment provider changed; reconcile the existing payment before retrying",
            )
        return existing_payment

    try:
        result = provider.start(
            PaymentRequest(amount=order.total_amount, order_id=order.id)
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="Payment provider is temporarily unavailable",
        ) from exc

    if existing_payment:
        payment = existing_payment
        payment.provider = provider.name
        payment.authority = result.authority
        payment.amount = order.total_amount
        payment.status = "PENDING"
        payment.reference_id = None
        payment.paid_at = None
        retry = True
    else:
        payment = Payment(
            order_id=order.id,
            provider=provider.name,
            authority=result.authority,
            amount=order.total_amount,
            status="PENDING",
        )
        db.add(payment)
        retry = False

    record_event(
        db,
        action="payment.created",
        entity_type="payment",
        entity_id=order_id,
        actor=user,
        request_id=get_request_id(),
        details={
            "provider": provider.name,
            "amount": str(order.total_amount),
            "retry": retry,
        },
    )
    db.commit()
    db.refresh(payment)
    return payment


def verify_payment(db: Session, authority: str, expected_order_id: int | None = None) -> Payment:
    # Lock ordering is intentionally Order -> Payment. The expiration worker
    # follows the same order so payment verification cannot race expiration.
    payment = db.scalar(select(Payment).where(Payment.authority == authority))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if expected_order_id is not None and payment.order_id != expected_order_id:
        raise HTTPException(status_code=400, detail="Payment does not belong to this order")

    order = db.scalar(
        select(Order)
        .where(Order.id == payment.order_id)
        .with_for_update()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = db.scalar(
        select(Payment)
        .where(Payment.id == payment.id)
        .with_for_update()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status == "PAID":
        # Reconcile legacy paid payments without creating new merchant
        # liabilities for orders which have since been cancelled or expired.
        if order.status not in CLOSED_ORDER_STATUSES:
            ensure_settlement_for_payment(db, payment, order)
        db.commit()
        db.refresh(payment)
        return payment

    if payment.status in {"REFUND_REQUIRED", "REFUNDED"}:
        # Idempotent callback: the captured payment is queued for review or the
        # refund was already recorded. Never create a merchant settlement.
        db.commit()
        db.refresh(payment)
        return payment

    if order.status not in {
        OrderStatus.PENDING,
        OrderStatus.CANCELLED,
        OrderStatus.EXPIRED,
    }:
        raise HTTPException(status_code=409, detail="Order is no longer payable")

    provider = get_payment_provider()
    # Verify through the same provider that issued the persisted authority.
    # Configuration changes must not validate an old authority through another
    # gateway (for example, a mock provider or a different payment account).
    if payment.provider != provider.name:
        raise HTTPException(
            status_code=409,
            detail="Payment provider configuration does not match this payment",
        )

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
            details={"order_id": order.id, "order_status": order.status.value},
        )
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")

    payment.reference_id = result.reference_id
    payment.paid_at = datetime.now(timezone.utc)

    if order.status in CLOSED_ORDER_STATUSES:
        # The customer may have paid at the gateway just before cancellation
        # or expiry won the database lock. Do not reopen the order or release
        # it to fulfillment: record the confirmed charge and queue a manual
        # refund review instead.
        payment.status = "REFUND_REQUIRED"
        create_notification(
            db,
            user_id=order.customer_id,
            title="پرداخت نیازمند پیگیری",
            body=f"پرداخت سفارش #{order.id} تأیید شده، اما سفارش بسته شده است. بازپرداخت نیازمند بررسی پشتیبانی است.",
            notification_type="PAYMENT",
            entity_type="order",
            entity_id=order.id,
        )
        admins = list(
            db.scalars(select(User).where(User.role == UserRole.ADMIN)).all()
        )
        for admin in admins:
            create_notification(
                db,
                user_id=admin.id,
                title="پرداخت نیازمند بررسی بازپرداخت",
                body=f"پرداخت سفارش بسته‌شده #{order.id} تأیید شده است؛ مرجع تراکنش را بررسی و بازپرداخت را پیگیری کنید.",
                notification_type="PAYMENT",
                entity_type="payment",
                entity_id=payment.id,
            )
        record_event(
            db,
            action="payment.verified_after_order_closed",
            entity_type="payment",
            entity_id=payment.id,
            request_id=get_request_id(),
            details={
                "order_id": order.id,
                "order_status": order.status.value,
                "reference_id": result.reference_id,
                "next_action": "manual_refund_review",
            },
        )
        db.commit()
        db.refresh(payment)
        return payment

    payment.status = "PAID"
    order.status = OrderStatus.PAID
    ensure_settlement_for_payment(db, payment, order)
    create_notification(
        db,
        user_id=order.customer_id,
        title="پرداخت موفق",
        body=f"پرداخت سفارش #{order.id} با موفقیت تأیید شد.",
        notification_type="PAYMENT",
        entity_type="order",
        entity_id=order.id,
    )
    if order.merchant:
        create_notification(
            db,
            user_id=order.merchant.user_id,
            title="پرداخت سفارش تأیید شد",
            body=f"پرداخت سفارش #{order.id} تأیید شد و سفارش آماده پردازش است.",
            notification_type="PAYMENT",
            entity_type="order",
            entity_id=order.id,
        )
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
