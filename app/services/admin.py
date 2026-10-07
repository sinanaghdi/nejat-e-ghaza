from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.request_context import get_request_id
from app.db.models.food_offer import FoodOffer
from app.db.models.merchant import Merchant
from app.db.models.user import User
from app.models.enums import MerchantVerificationStatus, OfferModerationStatus, UserRole
from app.repositories import user as user_repository
from app.services.audit import record_event
from app.services.notification import create_notification


def list_users(db: Session) -> list[User]:
    return user_repository.list_users(db)


def update_user_role(db: Session, target_user_id: int, role: UserRole, actor: User | None = None) -> User:
    user = user_repository.get_by_id(db, target_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.ADMIN and role != UserRole.ADMIN:
        raise HTTPException(status_code=409, detail="Admin role cannot be removed through this endpoint")

    previous_role = user.role
    user.role = role
    record_event(
        db,
        action="user.role_changed",
        entity_type="user",
        entity_id=user.id,
        actor=actor,
        request_id=get_request_id(),
        details={"from_role": previous_role.value, "to_role": role.value},
    )
    db.commit()
    db.refresh(user)
    return user


def list_orders(db: Session):
    from app.db.models.order import Order

    statement = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(100)
    )
    return list(db.scalars(statement).all())


def list_merchants(db: Session) -> list[Merchant]:
    statement = (
        select(Merchant)
        .options(selectinload(Merchant.user))
        .order_by(Merchant.created_at.desc(), Merchant.id.desc())
    )
    return list(db.scalars(statement).all())


def update_merchant_verification(
    db: Session,
    merchant_id: int,
    status_value: MerchantVerificationStatus,
    reason: str | None,
    actor: User,
) -> Merchant:
    merchant = db.scalar(
        select(Merchant)
        .where(Merchant.id == merchant_id)
        .with_for_update()
    )
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    reason_value = reason.strip() if reason and reason.strip() else None
    if status_value == MerchantVerificationStatus.SUSPENDED and not reason_value:
        raise HTTPException(status_code=422, detail="A suspension reason is required")

    previous_status = merchant.verification_status
    merchant.verification_status = status_value.value
    merchant.verification_reason = reason_value

    title, body = {
        MerchantVerificationStatus.VERIFIED: (
            "فروشگاه تأیید شد",
            "حساب فروشگاه شما تأیید شد و پیشنهادهای تأییدشده می‌توانند عمومی شوند.",
        ),
        MerchantVerificationStatus.SUSPENDED: (
            "فروشگاه تعلیق شد",
            f"حساب فروشگاه شما تعلیق شد. علت: {reason_value}",
        ),
        MerchantVerificationStatus.PENDING: (
            "وضعیت فروشگاه تغییر کرد",
            "وضعیت احراز فروشگاه شما به «در انتظار بررسی» تغییر کرد.",
        ),
    }[status_value]

    create_notification(
        db,
        user_id=merchant.user_id,
        title=title,
        body=body,
        notification_type="MODERATION",
        entity_type="merchant",
        entity_id=merchant.id,
    )
    record_event(
        db,
        action="merchant.verification_changed",
        entity_type="merchant",
        entity_id=merchant.id,
        actor=actor,
        request_id=get_request_id(),
        details={
            "from_status": previous_status,
            "to_status": status_value.value,
            "reason": reason_value,
        },
    )
    db.commit()
    db.refresh(merchant)
    return merchant


def list_pending_offers(db: Session) -> list[FoodOffer]:
    statement = (
        select(FoodOffer)
        .options(selectinload(FoodOffer.merchant))
        .where(FoodOffer.moderation_status == OfferModerationStatus.PENDING.value)
        .order_by(FoodOffer.created_at.asc(), FoodOffer.id.asc())
        .limit(100)
    )
    return list(db.scalars(statement).all())


def moderate_offer(
    db: Session,
    offer_id: int,
    status_value: OfferModerationStatus,
    reason: str | None,
    actor: User,
) -> FoodOffer:
    if status_value == OfferModerationStatus.PENDING:
        raise HTTPException(status_code=422, detail="Admin cannot move an offer back to pending directly")

    offer = db.scalar(
        select(FoodOffer)
        .options(selectinload(FoodOffer.merchant))
        .where(FoodOffer.id == offer_id)
        .with_for_update()
    )
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    reason_value = reason.strip() if reason and reason.strip() else None
    if status_value == OfferModerationStatus.REJECTED and not reason_value:
        raise HTTPException(status_code=422, detail="A rejection reason is required")

    previous_status = offer.moderation_status
    offer.moderation_status = status_value.value
    offer.moderation_reason = reason_value
    offer.moderated_at = datetime.now(timezone.utc)

    if status_value == OfferModerationStatus.APPROVED:
        title = "پیشنهاد تأیید شد"
        body = f"پیشنهاد «{offer.title}» تأیید شد و در صورت فعال‌بودن فروشگاه، قابل نمایش است."
    else:
        title = "پیشنهاد رد شد"
        body = f"پیشنهاد «{offer.title}» رد شد. علت: {reason_value}"

    create_notification(
        db,
        user_id=offer.merchant.user_id,
        title=title,
        body=body,
        notification_type="MODERATION",
        entity_type="offer",
        entity_id=offer.id,
    )
    record_event(
        db,
        action="offer.moderation_changed",
        entity_type="offer",
        entity_id=offer.id,
        actor=actor,
        request_id=get_request_id(),
        details={
            "from_status": previous_status,
            "to_status": status_value.value,
            "reason": reason_value,
        },
    )
    db.commit()
    db.refresh(offer)
    return offer
