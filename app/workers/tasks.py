from app.db.database import SessionLocal
from app.services.order import expire_pending_orders


def expire_pending_orders_task() -> int:
    with SessionLocal() as db:
        return expire_pending_orders(db)
