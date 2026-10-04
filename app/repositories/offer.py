from sqlalchemy import and_, func, or_, select
from app.db.models.merchant import Merchant
from sqlalchemy.orm import Session

from app.db.models.food_offer import FoodOffer


def create(db: Session, offer: FoodOffer) -> FoodOffer:
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


def get_by_id(db: Session, offer_id: int) -> FoodOffer | None:
    statement = (
        select(FoodOffer)
        .join(Merchant, FoodOffer.merchant_id == Merchant.id)
        .where(FoodOffer.id == offer_id)
    )
    return db.scalar(statement)


def list_active(
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
    filters = [
        FoodOffer.is_active.is_(True),
        FoodOffer.available_quantity > 0,
    ]

    if query:
        term = f"%{query.strip()}%"
        filters.append(
            or_(
                FoodOffer.title.ilike(term),
                FoodOffer.description.ilike(term),
                Merchant.business_name.ilike(term),
            )
        )
    if city:
        filters.append(Merchant.city.ilike(city.strip()))
    if min_price is not None:
        filters.append(FoodOffer.sale_price >= min_price)
    if max_price is not None:
        filters.append(FoodOffer.sale_price <= max_price)

    distance_expr = None
    if latitude is not None and longitude is not None:
        lat = func.radians(Merchant.latitude)
        lon = func.radians(Merchant.longitude)
        user_lat = func.radians(latitude)
        user_lon = func.radians(longitude)
        distance_expr = 6371 * func.acos(
            func.cos(user_lat) * func.cos(lat) * func.cos(lon - user_lon)
            + func.sin(user_lat) * func.sin(lat)
        )
        if radius_km is not None:
            filters.append(
                and_(
                    Merchant.latitude.is_not(None),
                    Merchant.longitude.is_not(None),
                    distance_expr <= radius_km,
                )
            )

    if sort == "distance" and distance_expr is not None:
        ordering = distance_expr.asc()
    elif sort == "price_asc":
        ordering = FoodOffer.sale_price.asc()
    elif sort == "price_desc":
        ordering = FoodOffer.sale_price.desc()
    elif sort == "discount":
        ordering = (FoodOffer.original_price - FoodOffer.sale_price).desc()
    else:
        ordering = FoodOffer.created_at.desc()

    statement = (
        select(FoodOffer)
        .join(Merchant, FoodOffer.merchant_id == Merchant.id)
        .where(and_(*filters))
        .order_by(ordering, FoodOffer.id.desc())
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
