from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class MerchantSettlementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    payment_id: int
    merchant_id: int
    gross_amount: Decimal
    commission_rate_bps: int
    commission_amount: Decimal
    net_amount: Decimal
    status: str
    payout_reference: str | None
    settled_at: datetime | None
    created_at: datetime


class MarkSettlementPaidRequest(BaseModel):
    payout_reference: str = Field(min_length=3, max_length=255)
