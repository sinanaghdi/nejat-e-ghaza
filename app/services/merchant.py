from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.request_context import get_request_id
from app.db.models.merchant import Merchant
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import merchant as merchant_repository
from app.schemas.merchant import MerchantCreate, MerchantUpdate
from app.services.audit import record_event


def get_my_profile(db: Session, user: User) -> Merchant:
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=403, detail="Merchant access required")
    merchant = merchant_repository.get_by_user_id(db, user.id)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    return merchant


def create_profile(db: Session, user: User, payload: MerchantCreate) -> Merchant:
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=403, detail="Merchant access required")
    if merchant_repository.get_by_user_id(db, user.id):
        raise HTTPException(status_code=409, detail="Merchant profile already exists")

    merchant = Merchant(
        user_id=user.id,
        verification_status="PENDING",
        verification_reason=None,
        **payload.model_dump(),
    )
    try:
        db.add(merchant)
        db.flush()
        record_event(
            db,
            action="merchant.profile_created",
            entity_type="merchant",
            entity_id=merchant.id,
            actor=user,
            request_id=get_request_id(),
            details={"verification_status": "PENDING"},
        )
        db.commit()
        db.refresh(merchant)
        return merchant
    except IntegrityError as exc:
        db.rollback()
        # A concurrent request may have created the unique user_id first.
        if merchant_repository.get_by_user_id(db, user.id):
            raise HTTPException(status_code=409, detail="Merchant profile already exists") from exc
        raise
    except Exception:
        db.rollback()
        raise


def update_profile(db: Session, user: User, payload: MerchantUpdate) -> Merchant:
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=403, detail="Merchant access required")

    try:
        merchant = db.scalar(
            select(Merchant)
            .where(Merchant.user_id == user.id)
            .with_for_update()
        )
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")

        values = payload.model_dump()
        for field, value in values.items():
            setattr(merchant, field, value)

        record_event(
            db,
            action="merchant.profile_updated",
            entity_type="merchant",
            entity_id=merchant.id,
            actor=user,
            request_id=get_request_id(),
            details={"updated_fields": sorted(values.keys())},
        )
        db.commit()
        db.refresh(merchant)
        return merchant
    except Exception:
        db.rollback()
        raise
