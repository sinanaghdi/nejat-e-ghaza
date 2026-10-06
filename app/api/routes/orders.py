from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.dependencies import get_current_user, require_role
from app.db.database import get_db
from app.db.models.user import User
from app.models.enums import UserRole, OrderStatus
from app.schemas.order import OrderCreate, OrderResponse, PickupVerifyRequest
from app.services import order as order_service

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, current_user: Annotated[User, Depends(require_role(UserRole.CUSTOMER))], db: Annotated[Session, Depends(get_db)]):
    return order_service.create_order(db, current_user, payload)

@router.get("", response_model=list[OrderResponse])
def list_orders(current_user: Annotated[User, Depends(require_role(UserRole.CUSTOMER))], db: Annotated[Session, Depends(get_db)]):
    return order_service.list_customer_orders(db, current_user)

@router.get("/merchant", response_model=list[OrderResponse])
def list_merchant_orders(current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))], db: Annotated[Session, Depends(get_db)]):
    return order_service.list_merchant_orders(db, current_user)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, current_user: Annotated[User, Depends(require_role(UserRole.CUSTOMER))], db: Annotated[Session, Depends(get_db)]):
    return order_service.get_customer_order(db, current_user, order_id)

@router.post("/{order_id}/pickup/verify", response_model=OrderResponse)
def verify_pickup(
    order_id: int,
    payload: PickupVerifyRequest,
    current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))],
    db: Annotated[Session, Depends(get_db)],
):
    return order_service.verify_pickup_code(db, current_user, order_id, payload.pickup_code)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_status(order_id: int, payload: OrderStatusUpdate, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return order_service.update_order_status(db, current_user, order_id, payload.status)
