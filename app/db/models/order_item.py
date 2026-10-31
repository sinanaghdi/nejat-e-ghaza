from decimal import Decimal
from sqlalchemy import CheckConstraint, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    food_offer_id: Mapped[int] = mapped_column(ForeignKey("food_offers.id"), index=True)
    quantity: Mapped[int] = mapped_column()
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    order = relationship("Order", back_populates="items")
    food_offer = relationship("FoodOffer", back_populates="order_items")
