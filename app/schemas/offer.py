from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class OfferCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    original_price: Decimal = Field(gt=0, decimal_places=2)
    sale_price: Decimal = Field(gt=0, decimal_places=2)
    quantity: int = Field(gt=0)
    pickup_start: datetime
    pickup_end: datetime
    image_url: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_offer(self):
        if self.sale_price > self.original_price:
            raise ValueError("sale_price must be less than or equal to original_price")
        if self.pickup_end <= self.pickup_start:
            raise ValueError("pickup_end must be after pickup_start")
        return self


class OfferUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    original_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    sale_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    quantity: int | None = Field(default=None, gt=0)
    available_quantity: int | None = Field(default=None, ge=0)
    pickup_start: datetime | None = None
    pickup_end: datetime | None = None
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_offer(self):
        if self.original_price is not None and self.sale_price is not None:
            if self.sale_price > self.original_price:
                raise ValueError("sale_price must be less than or equal to original_price")
        if self.pickup_start is not None and self.pickup_end is not None:
            if self.pickup_end <= self.pickup_start:
                raise ValueError("pickup_end must be after pickup_start")
        if self.quantity is not None and self.available_quantity is not None:
            if self.available_quantity > self.quantity:
                raise ValueError("available_quantity cannot exceed quantity")
        return self


class MerchantSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_name: str
    city: str
    address: str
    latitude: float | None
    longitude: float | None


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    merchant_id: int
    merchant: MerchantSummary
    title: str
    description: str | None
    original_price: Decimal
    sale_price: Decimal
    quantity: int
    available_quantity: int
    pickup_start: datetime
    pickup_end: datetime
    image_url: str | None
    is_active: bool
    created_at: datetime
