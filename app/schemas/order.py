from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OrderStatus


class OrderItemCreate(BaseModel):
    food_offer_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    food_offer_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class OrderOperationalResponse(BaseModel):
    """Order view for operators; the customer-only pickup secret is omitted."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    merchant_id: int
    total_amount: Decimal
    status: OrderStatus
    created_at: datetime
    items: list[OrderItemResponse]


class OrderResponse(OrderOperationalResponse):
    """Customer-owned order view, which includes the pickup secret."""
    pickup_code: str


class PickupVerifyRequest(BaseModel):
    pickup_code: str = Field(min_length=4, max_length=32)
