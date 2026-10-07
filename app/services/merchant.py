from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.db.models.merchant import Merchant
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import merchant as merchant_repository
from app.schemas.merchant import MerchantCreate, MerchantUpdate

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
    db.add(merchant)
    db.commit()
    db.refresh(merchant)
    return merchant


def update_profile(db: Session, user: User, payload: MerchantUpdate) -> Merchant:
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=403, detail="Merchant access required")

    merchant = merchant_repository.get_by_user_id(db, user.id)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")

    for field, value in payload.model_dump().items():
        setattr(merchant, field, value)

    db.commit()
    db.refresh(merchant)
    return merchant
