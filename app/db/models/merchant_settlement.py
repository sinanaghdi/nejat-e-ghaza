from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class MerchantSettlement(Base):
    __tablename__ = "merchant_settlements"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), unique=True, index=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), unique=True, index=True)
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"), index=True)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    commission_rate_bps: Mapped[int] = mapped_column(Integer)
    commission_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    net_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False, index=True)
    payout_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
