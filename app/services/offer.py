from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.request_context import get_request_id
from app.db.models.food_offer import FoodOffer
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import merchant as merchant_repository
from app.repositories import offer as offer_repository
from app.schemas.offer import OfferCreate, OfferUpdate
from app.services.audit import record_event


def _get_merchant_or_403(db: Session, user: User):
    if user.role != UserRole.MERCHANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Merchant access required")

    merchant = merchant_repository.get_by_user_id(db, user.id)
    if not merchant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Merchant profile not found")
    if merchant.verification_status == "SUSPENDED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Merchant account is suspended")
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
        moderation_status="PENDING",
        moderation_reason=None,
        moderated_at=None,
    )
    try:
        db.add(offer)
        db.flush()
        record_event(
            db,
            action="offer.created",
            entity_type="offer",
            entity_id=offer.id,
            actor=user,
            request_id=get_request_id(),
            details={"merchant_id": merchant.id, "moderation_status": "PENDING"},
        )
        db.commit()
        db.refresh(offer)
        return offer
    except Exception:
        db.rollback()
        raise


def get_offer(db: Session, offer_id: int) -> FoodOffer:
    offer = offer_repository.get_by_id(db, offer_id)
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
    return offer


def get_public_offer(db: Session, offer_id: int) -> FoodOffer:
    offer = offer_repository.get_public_by_id(db, offer_id)
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
    return offer


def list_active_offers(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    query: str | None = None,
    city: str | None = None,
    min_price=None,
    max_price=None,
    sort: str = "newest",
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: float | None = None,
) -> list[FoodOffer]:
    return offer_repository.list_active(
        db,
        skip=skip,
        limit=limit,
        query=query,
        city=city,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )


def list_merchant_offers(db: Session, user: User) -> list[FoodOffer]:
    merchant = _get_merchant_or_403(db, user)
    return offer_repository.list_by_merchant(db, merchant.id)


def update_offer(db: Session, user: User, offer_id: int, payload: OfferUpdate) -> FoodOffer:
    try:
        merchant = _get_merchant_or_403(db, user)
        # Orders reserve inventory under a row lock. Offer edits must take the
        # same lock before computing sold_quantity, otherwise concurrent orders
        # can make a stale quantity snapshot overwrite the inventory balance.
        offer = db.scalar(
            select(FoodOffer)
            .where(FoodOffer.id == offer_id)
            .with_for_update()
        )
        if not offer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
        if offer.merchant_id != merchant.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this offer")

        values = payload.model_dump(exclude_unset=True)
        previous_quantity = offer.quantity
        previous_available_quantity = offer.available_quantity
        sold_quantity = previous_quantity - previous_available_quantity

        requested_quantity = values.pop("quantity", previous_quantity)
        requested_available = values.pop("available_quantity", None)

        if requested_quantity < sold_quantity:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="quantity cannot be lower than already sold quantity",
            )

        new_available_quantity = requested_quantity - sold_quantity
        if requested_available is not None:
            if requested_available > new_available_quantity:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="available_quantity cannot exceed unsold inventory",
                )
            new_available_quantity = requested_available

        offer.quantity = requested_quantity
        offer.available_quantity = new_available_quantity

        material_fields = {
            "title",
            "description",
            "original_price",
            "sale_price",
            "pickup_start",
            "pickup_end",
            "image_url",
        }
        material_change = any(field in values for field in material_fields)

        for field, value in values.items():
            setattr(offer, field, value)

        if offer.sale_price > offer.original_price:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="sale_price must be less than or equal to original_price")
        if offer.pickup_end <= offer.pickup_start:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="pickup_end must be after pickup_start")
        if offer.available_quantity > offer.quantity:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="available_quantity cannot exceed quantity")

        if material_change:
            offer.moderation_status = "PENDING"
            offer.moderation_reason = None
            offer.moderated_at = None

        record_event(
            db,
            action="offer.updated",
            entity_type="offer",
            entity_id=offer.id,
            actor=user,
            request_id=get_request_id(),
            details={
                "updated_fields": sorted(payload.model_fields_set),
                "moderation_reset": material_change,
                "available_quantity": offer.available_quantity,
                "quantity": offer.quantity,
            },
        )
        db.commit()
        db.refresh(offer)
        return offer
    except Exception:
        db.rollback()
        raise


def deactivate_offer(db: Session, user: User, offer_id: int) -> FoodOffer:
    try:
        merchant = _get_merchant_or_403(db, user)
        offer = db.scalar(
            select(FoodOffer)
            .where(FoodOffer.id == offer_id)
            .with_for_update()
        )
        if not offer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
        if offer.merchant_id != merchant.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this offer")

        offer.is_active = False
        record_event(
            db,
            action="offer.deactivated",
            entity_type="offer",
            entity_id=offer.id,
            actor=user,
            request_id=get_request_id(),
            details={"merchant_id": merchant.id},
        )
        db.commit()
        db.refresh(offer)
        return offer
    except Exception:
        db.rollback()
        raise
