from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models.order import Order


def get_by_id(db: Session, order_id: int) -> Order | None:
    statement = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    return db.scalar(statement)


def list_by_customer(db: Session, customer_id: int) -> list[Order]:
    statement = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.customer_id == customer_id)
        .order_by(Order.created_at.desc())
    )
    return list(db.scalars(statement).all())
