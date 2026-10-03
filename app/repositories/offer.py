from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.food_offer import FoodOffer


def create(db: Session, offer: FoodOffer) -> FoodOffer:
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


def get_by_id(db: Session, offer_id: int) -> FoodOffer | None:
    return db.get(FoodOffer, offer_id)


def list_active(db: Session, skip: int = 0, limit: int = 50) -> list[FoodOffer]:
    statement = (
        select(FoodOffer)
        .where(FoodOffer.is_active.is_(True), FoodOffer.available_quantity > 0)
        .order_by(FoodOffer.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(statement).all())


def list_by_merchant(db: Session, merchant_id: int) -> list[FoodOffer]:
    statement = (
        select(FoodOffer)
        .where(FoodOffer.merchant_id == merchant_id)
        .order_by(FoodOffer.created_at.desc())
    )
    return list(db.scalars(statement).all())
