from typing import Annotated

from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.db.database import get_db
from app.db.models.food_offer import FoodOffer
from app.db.models.user import User
from app.models.enums import UserRole
from app.schemas.offer import OfferCreate, OfferResponse, OfferUpdate
from app.services import offer as offer_service

router = APIRouter(prefix="/api/offers", tags=["offers"])


@router.get("", response_model=list[OfferResponse])
def list_offers(
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    query: str | None = Query(default=None, min_length=1, max_length=100),
    city: str | None = Query(default=None, min_length=1, max_length=100),
    min_price: Decimal | None = Query(default=None, gt=0),
    max_price: Decimal | None = Query(default=None, gt=0),
    sort: str = Query(default="newest", pattern="^(newest|price_asc|price_desc|discount|distance)$"),
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float | None = Query(default=None, gt=0, le=100),
):
    if (latitude is None) != (longitude is None):
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="latitude and longitude must be provided together")
    if radius_km is not None and latitude is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="radius_km requires latitude and longitude")
    if sort == "distance" and latitude is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="distance sort requires latitude and longitude")
    if min_price is not None and max_price is not None and min_price > max_price:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="min_price cannot exceed max_price")

    return offer_service.list_active_offers(
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


@router.get("/mine", response_model=list[OfferResponse])
def list_my_offers(
    current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))],
    db: Annotated[Session, Depends(get_db)],
):
    return offer_service.list_merchant_offers(db, current_user)


@router.get("/{offer_id}", response_model=OfferResponse)
def get_offer(offer_id: int, db: Annotated[Session, Depends(get_db)]):
    return offer_service.get_public_offer(db, offer_id)


@router.post("", response_model=OfferResponse, status_code=status.HTTP_201_CREATED)
def create_offer(
    payload: OfferCreate,
    current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))],
    db: Annotated[Session, Depends(get_db)],
):
    return offer_service.create_offer(db, current_user, payload)


@router.patch("/{offer_id}", response_model=OfferResponse)
def update_offer(
    offer_id: int,
    payload: OfferUpdate,
    current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))],
    db: Annotated[Session, Depends(get_db)],
):
    return offer_service.update_offer(db, current_user, offer_id, payload)


@router.delete("/{offer_id}", response_model=OfferResponse)
def deactivate_offer(
    offer_id: int,
    current_user: Annotated[User, Depends(require_role(UserRole.MERCHANT))],
    db: Annotated[Session, Depends(get_db)],
):
    return offer_service.deactivate_offer(db, current_user, offer_id)
