from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db.database import get_db
from app.db.models.user import User
from app.db.models.payment import Payment
from app.db.models.order import Order
from app.core.request_context import get_request_id
from app.models.enums import OfferModerationStatus, UserRole
from app.schemas.merchant import MerchantAdminResponse, MerchantVerificationUpdate
from app.schemas.offer import AdminOfferModerationResponse, OfferModerationUpdate
from app.schemas.order import OrderOperationalResponse
from app.schemas.payment import PaymentResponse, MarkRefundCompletedRequest
from app.schemas.settlement import MarkSettlementPaidRequest, MerchantSettlementResponse
from app.schemas.user import RoleUpdate, UserAdminResponse
from app.services import admin as admin_service
from app.services import settlement as settlement_service
from app.services.audit import record_event
from app.services.notification import create_notification

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserAdminResponse])
def list_users(
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.list_users(db)


@router.get("/orders", response_model=list[OrderOperationalResponse])
def list_orders(
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.list_orders(db)


@router.patch("/users/{user_id}/role", response_model=UserAdminResponse)
def update_role(
    user_id: int,
    payload: RoleUpdate,
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.update_user_role(db, user_id, payload.role, current_user)


@router.get("/merchants", response_model=list[MerchantAdminResponse])
def list_merchants(
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.list_merchants(db)


@router.patch("/merchants/{merchant_id}/verification", response_model=MerchantAdminResponse)
def update_merchant_verification(
    merchant_id: int,
    payload: MerchantVerificationUpdate,
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.update_merchant_verification(
        db,
        merchant_id,
        payload.status,
        payload.reason,
        current_user,
    )


@router.get("/offers/pending", response_model=list[AdminOfferModerationResponse])
def list_pending_offers(
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.list_pending_offers(db)


@router.patch("/offers/{offer_id}/moderation", response_model=AdminOfferModerationResponse)
def moderate_offer(
    offer_id: int,
    payload: OfferModerationUpdate,
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    if payload.status == OfferModerationStatus.PENDING:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Admin cannot move an offer back to pending directly")
    return admin_service.moderate_offer(
        db,
        offer_id,
        payload.status,
        payload.reason,
        current_user,
    )



@router.get("/settlements", response_model=list[MerchantSettlementResponse])
def list_settlements(
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return settlement_service.list_all_settlements(db)


@router.patch("/settlements/{settlement_id}/paid", response_model=MerchantSettlementResponse)
def mark_settlement_paid(
    settlement_id: int,
    payload: MarkSettlementPaidRequest,
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return settlement_service.mark_settlement_paid(
        db,
        settlement_id,
        payload.payout_reference,
        current_user,
    )



@router.get("/payments/refund-required", response_model=list[PaymentResponse])
def list_refund_required_payments(
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    """Return successful gateway charges that need manual refund review."""
    return list(
        db.scalars(
            select(Payment)
            .where(Payment.status == "REFUND_REQUIRED")
            .order_by(Payment.id.asc())
            .limit(200)
        ).all()
    )


@router.patch("/payments/{payment_id}/refund-completed", response_model=PaymentResponse)
def mark_refund_completed(
    payment_id: int,
    payload: MarkRefundCompletedRequest,
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    """Record a refund already completed through the payment provider or bank."""
    payment = db.scalar(
        select(Payment)
        .where(Payment.id == payment_id)
        .with_for_update()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status == "REFUNDED":
        return payment
    if payment.status != "REFUND_REQUIRED":
        raise HTTPException(
            status_code=409,
            detail="Only payments awaiting refund review can be marked refunded",
        )

    refund_reference = payload.refund_reference.strip()
    if len(refund_reference) < 3:
        raise HTTPException(status_code=422, detail="Refund reference is required")

    payment.status = "REFUNDED"
    order = db.get(Order, payment.order_id)
    if order:
        create_notification(
            db,
            user_id=order.customer_id,
            title="بازپرداخت ثبت شد",
            body=f"بازپرداخت مربوط به سفارش #{order.id} ثبت شد. مرجع بازپرداخت: {refund_reference}",
            notification_type="PAYMENT",
            entity_type="order",
            entity_id=order.id,
        )
    record_event(
        db,
        action="payment.refund_completed",
        entity_type="payment",
        entity_id=payment.id,
        actor=current_user,
        request_id=get_request_id(),
        details={
            "order_id": payment.order_id,
            "amount": str(payment.amount),
            "provider_payment_reference": payment.reference_id,
            "refund_reference": refund_reference,
        },
    )
    db.commit()
    db.refresh(payment)
    return payment
