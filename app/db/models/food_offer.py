from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class FoodOffer(Base):
    __tablename__ = "food_offers"
    __table_args__ = (
        CheckConstraint("original_price > 0", name="ck_food_offers_original_price_positive"),
        CheckConstraint("sale_price > 0", name="ck_food_offers_sale_price_positive"),
        CheckConstraint("sale_price <= original_price", name="ck_food_offers_sale_lte_original"),
        CheckConstraint("quantity > 0", name="ck_food_offers_quantity_positive"),
        CheckConstraint("available_quantity >= 0", name="ck_food_offers_available_nonnegative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    sale_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    quantity: Mapped[int] = mapped_column()
    available_quantity: Mapped[int] = mapped_column()
    pickup_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    pickup_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    moderation_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False, index=True)
    moderation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    moderated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    merchant = relationship("Merchant", back_populates="offers")
    order_items = relationship("OrderItem", back_populates="food_offer")
