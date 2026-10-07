from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db.database import get_db
from app.db.models.user import User
from app.models.enums import OfferModerationStatus, UserRole
from app.schemas.merchant import MerchantAdminResponse, MerchantVerificationUpdate
from app.schemas.offer import AdminOfferModerationResponse, OfferModerationUpdate
from app.schemas.order import OrderResponse
from app.schemas.user import RoleUpdate, UserAdminResponse
from app.services import admin as admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserAdminResponse])
def list_users(
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.list_users(db)


@router.get("/orders", response_model=list[OrderResponse])
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
