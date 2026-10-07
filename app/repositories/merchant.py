from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models.merchant import Merchant


def get_by_user_id(db: Session, user_id: int) -> Merchant | None:
    return db.scalar(select(Merchant).where(Merchant.user_id == user_id))


def get_by_id(db: Session, merchant_id: int, *, lock: bool = False) -> Merchant | None:
    statement = select(Merchant).options(selectinload(Merchant.user))
    if lock:
        statement = statement.with_for_update()
    return db.scalar(statement.where(Merchant.id == merchant_id))


def list_all(db: Session) -> list[Merchant]:
    statement = (
        select(Merchant)
        .options(selectinload(Merchant.user))
        .order_by(Merchant.created_at.desc(), Merchant.id.desc())
    )
    return list(db.scalars(statement).all())
