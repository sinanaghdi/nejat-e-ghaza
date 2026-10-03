from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import require_role
from app.db.database import SessionLocal, get_db
from app.db.models.user import User
from app.models.enums import UserRole
from app.schemas.payment import PaymentResponse, PaymentStartResponse, PaymentWebhook
from app.services import payment as payment_service

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/orders/{order_id}", response_model=PaymentStartResponse)
def create_payment(
    order_id: int,
    current_user: Annotated[User, Depends(require_role(UserRole.CUSTOMER))],
    db: Annotated[Session, Depends(get_db)],
):
    payment = payment_service.create_payment(db, current_user, order_id)
    if payment.provider == "mock":
        checkout_url = f"/api/payments/mock/checkout/{payment.authority}"
    else:
        checkout_base = "https://sandbox.zarinpal.com/pg/StartPay/" if settings.zarinpal_sandbox else "https://www.zarinpal.com/pg/StartPay/"
        checkout_url = f"{checkout_base}{payment.authority}"
    return {"payment": payment, "checkout_url": checkout_url}


@router.post("/webhook", response_model=PaymentResponse)
def payment_webhook(
    payload: PaymentWebhook,
    db: Annotated[Session, Depends(get_db)],
    x_webhook_secret: Annotated[str | None, Header()] = None,
):
    if not x_webhook_secret or x_webhook_secret != settings.payment_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook credentials")
    return payment_service.verify_payment(db, payload.authority)


@router.get("/zarinpal/callback")
def zarinpal_callback(
    authority: str | None = Query(default=None, alias="Authority"),
    gateway_status: str | None = Query(default=None, alias="Status"),
    order_id: int | None = Query(default=None),
):
    if not authority:
        return RedirectResponse(url=f"{settings.frontend_payment_result_url}?status=failed")

    if gateway_status != "OK":
        return RedirectResponse(
            url=f"{settings.frontend_payment_result_url}?status=cancelled&order_id={order_id or ''}"
        )

    db = SessionLocal()
    try:
        payment = payment_service.verify_payment(db, authority, expected_order_id=order_id)
        ref_id = payment.reference_id or ""
        return RedirectResponse(
            url=f"{settings.frontend_payment_result_url}?status=success&order_id={payment.order_id}&ref_id={ref_id}"
        )
    except HTTPException:
        return RedirectResponse(
            url=f"{settings.frontend_payment_result_url}?status=failed&order_id={order_id or ''}"
        )
    finally:
        db.close()
