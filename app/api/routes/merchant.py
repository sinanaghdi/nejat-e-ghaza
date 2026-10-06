from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.dependencies import require_role
from app.db.database import get_db
from app.db.models.user import User
from app.models.enums import UserRole
from app.schemas.merchant import MerchantCreate, MerchantResponse, MerchantUpdate
from app.services import merchant as merchant_service

router = APIRouter(prefix="/api/merchant", tags=["merchant"])

@router.post("/profile", response_model=MerchantResponse, status_code=status.HTTP_201_CREATED)
def create_profile(payload: MerchantCreate, current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))], db: Annotated[Session, Depends(get_db)]):
    return merchant_service.create_profile(db, current_user, payload)

@router.patch("/profile", response_model=MerchantResponse)
def update_profile(
    payload: MerchantUpdate,
    current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))],
    db: Annotated[Session, Depends(get_db)],
):
    return merchant_service.update_profile(db, current_user, payload)


@router.get("/profile", response_model=MerchantResponse)
def get_profile(current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))], db: Annotated[Session, Depends(get_db)]):
    return merchant_service.get_my_profile(db, current_user)
