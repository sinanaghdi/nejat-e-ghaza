from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import require_role
from app.db.database import get_db
from app.db.models.user import User
from app.models.enums import UserRole
from app.schemas.payment import PaymentResponse, PaymentWebhook
from app.services import payment as payment_service

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/orders/{order_id}", response_model=PaymentResponse)
def create_payment(
    order_id: int,
    current_user: Annotated[User, Depends(require_role(UserRole.CUSTOMER))],
    db: Annotated[Session, Depends(get_db)],
):
    return payment_service.create_payment(db, current_user, order_id)


@router.post("/webhook", response_model=PaymentResponse)
def payment_webhook(
    payload: PaymentWebhook,
    db: Annotated[Session, Depends(get_db)],
    x_webhook_secret: Annotated[str | None, Header()] = None,
):
    if not x_webhook_secret or x_webhook_secret != settings.payment_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook credentials")
    return payment_service.verify_payment(db, payload.authority)
