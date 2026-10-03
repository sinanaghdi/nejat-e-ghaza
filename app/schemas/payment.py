from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    provider: str
    authority: str
    reference_id: str | None
    amount: Decimal
    status: str
    created_at: datetime
    paid_at: datetime | None


class PaymentWebhook(BaseModel):
    authority: str
