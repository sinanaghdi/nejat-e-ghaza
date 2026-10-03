from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.merchant import Merchant


def get_by_user_id(db: Session, user_id: int) -> Merchant | None:
    return db.scalar(select(Merchant).where(Merchant.user_id == user_id))
