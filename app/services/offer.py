from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.food_offer import FoodOffer
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import merchant as merchant_repository
from app.repositories import offer as offer_repository
from app.schemas.offer import OfferCreate, OfferUpdate


def _get_merchant_or_403(db: Session, user: User):
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Merchant access required")

    merchant = merchant_repository.get_by_user_id(db, user.id)
    if not merchant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Merchant profile not found")
    return merchant


def create_offer(db: Session, user: User, payload: OfferCreate) -> FoodOffer:
    merchant = _get_merchant_or_403(db, user)
    offer = FoodOffer(
        merchant_id=merchant.id,
        title=payload.title,
        description=payload.description,
        original_price=payload.original_price,
        sale_price=payload.sale_price,
        quantity=payload.quantity,
        available_quantity=payload.quantity,
        pickup_start=payload.pickup_start,
        pickup_end=payload.pickup_end,
        image_url=payload.image_url,
    )
    return offer_repository.create(db, offer)


def get_offer(db: Session, offer_id: int) -> FoodOffer:
    offer = offer_repository.get_by_id(db, offer_id)
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
    return offer


def list_active_offers(db: Session, skip: int = 0, limit: int = 50) -> list[FoodOffer]:
    return offer_repository.list_active(db, skip=skip, limit=limit)


def list_merchant_offers(db: Session, user: User) -> list[FoodOffer]:
    merchant = _get_merchant_or_403(db, user)
    return offer_repository.list_by_merchant(db, merchant.id)


def update_offer(db: Session, user: User, offer_id: int, payload: OfferUpdate) -> FoodOffer:
    merchant = _get_merchant_or_403(db, user)
    offer = get_offer(db, offer_id)

    if offer.merchant_id != merchant.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this offer")

    values = payload.model_dump(exclude_unset=True)
    for field, value in values.items():
        setattr(offer, field, value)

    if offer.sale_price > offer.original_price:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="sale_price must be less than or equal to original_price")
    if offer.pickup_end <= offer.pickup_start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="pickup_end must be after pickup_start")
    if offer.available_quantity > offer.quantity:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="available_quantity cannot exceed quantity")

    db.commit()
    db.refresh(offer)
    return offer


def deactivate_offer(db: Session, user: User, offer_id: int) -> FoodOffer:
    merchant = _get_merchant_or_403(db, user)
    offer = get_offer(db, offer_id)

    if offer.merchant_id != merchant.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this offer")

    offer.is_active = False
    db.commit()
    db.refresh(offer)
    return offer
