from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.request_context import get_request_id
from app.db.models.merchant import Merchant
from app.db.models.merchant_settlement import MerchantSettlement
from app.db.models.order import Order
from app.db.models.payment import Payment
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import merchant as merchant_repository
from app.services.audit import record_event
from app.services.notification import create_notification


CENT = Decimal("0.01")


def ensure_settlement_for_payment(
    db: Session,
    payment: Payment,
    order: Order,
) -> MerchantSettlement:
    settlement = db.scalar(
        select(MerchantSettlement).where(MerchantSettlement.payment_id == payment.id)
    )
    if settlement:
        return settlement

    rate_bps = settings.platform_commission_bps
    gross = Decimal(order.total_amount).quantize(CENT, rounding=ROUND_HALF_UP)
    commission = (
        gross * Decimal(rate_bps) / Decimal(10000)
    ).quantize(CENT, rounding=ROUND_HALF_UP)
    settlement = MerchantSettlement(
        order_id=order.id,
        payment_id=payment.id,
        merchant_id=order.merchant_id,
        gross_amount=gross,
        commission_rate_bps=rate_bps,
        commission_amount=commission,
        net_amount=(gross - commission).quantize(CENT, rounding=ROUND_HALF_UP),
        status="PENDING",
    )
    db.add(settlement)
    db.flush()
    return settlement


def list_all_settlements(db: Session) -> list[MerchantSettlement]:
    return list(
        db.scalars(
            select(MerchantSettlement)
            .order_by(MerchantSettlement.created_at.desc(), MerchantSettlement.id.desc())
            .limit(500)
        ).all()
    )


def list_my_settlements(db: Session, user: User) -> list[MerchantSettlement]:
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=403, detail="Merchant access required")
    merchant = merchant_repository.get_by_user_id(db, user.id)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    return list(
        db.scalars(
            select(MerchantSettlement)
            .where(MerchantSettlement.merchant_id == merchant.id)
            .order_by(MerchantSettlement.created_at.desc(), MerchantSettlement.id.desc())
            .limit(500)
        ).all()
    )


def mark_settlement_paid(
    db: Session,
    settlement_id: int,
    payout_reference: str,
    actor: User,
) -> MerchantSettlement:
    settlement = db.scalar(
        select(MerchantSettlement)
        .where(MerchantSettlement.id == settlement_id)
        .with_for_update()
    )
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    reference = payout_reference.strip()
    if settlement.status == "PAID":
        if settlement.payout_reference == reference:
            return settlement
        raise HTTPException(status_code=409, detail="Settlement has already been marked paid")

    if len(reference) < 3:
        raise HTTPException(status_code=422, detail="Payout reference is required")

    settlement.status = "PAID"
    settlement.payout_reference = reference
    settlement.settled_at = datetime.now(timezone.utc)
    merchant = db.get(Merchant, settlement.merchant_id)
    if merchant:
        create_notification(
            db,
            user_id=merchant.user_id,
            title="تسویه فروش ثبت شد",
            body=f"تسویه سفارش #{settlement.order_id} با مبلغ {settlement.net_amount} تومان ثبت شد. مرجع پرداخت: {reference}",
            notification_type="SETTLEMENT",
            entity_type="settlement",
            entity_id=settlement.id,
        )
    record_event(
        db,
        action="merchant_settlement.marked_paid",
        entity_type="merchant_settlement",
        entity_id=settlement.id,
        actor=actor,
        request_id=get_request_id(),
        details={
            "order_id": settlement.order_id,
            "gross_amount": str(settlement.gross_amount),
            "commission_amount": str(settlement.commission_amount),
            "net_amount": str(settlement.net_amount),
            "payout_reference": reference,
        },
    )
    db.commit()
    db.refresh(settlement)
    return settlement
