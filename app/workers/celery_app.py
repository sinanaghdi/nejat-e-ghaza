from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "nejat_e_ghaza",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    beat_schedule={
        "expire-pending-orders": {
            "task": "app.workers.tasks.expire_pending_orders_task",
            "schedule": 60.0,
        },
    },
)

celery_app.autodiscover_tasks(["app.workers"])
