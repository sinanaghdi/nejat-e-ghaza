from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.notification import (
    MarkAllNotificationsReadResponse,
    NotificationListResponse,
    NotificationResponse,
)
from app.services import notification as notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    items, unread_count = notification_service.list_notifications(db, current_user)
    return {"items": items, "unread_count": unread_count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return notification_service.mark_read(db, current_user, notification_id)


@router.post("/read-all", response_model=MarkAllNotificationsReadResponse)
def mark_all_notifications_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return {"updated_count": notification_service.mark_all_read(db, current_user)}
