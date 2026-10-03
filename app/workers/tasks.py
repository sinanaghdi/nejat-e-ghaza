from app.services.order import expire_pending_orders
from app.workers.celery_app import celery_app


@celery_app.task(
    name="app.workers.tasks.expire_pending_orders_task",
    ignore_result=False,
)
def expire_pending_orders_task() -> int:
    from app.db.database import SessionLocal

    with SessionLocal() as db:
        return expire_pending_orders(db)
