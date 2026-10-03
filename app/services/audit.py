from typing import Any

from sqlalchemy.orm import Session

from app.core.request_context import get_client_ip, get_request_id
from app.db.models.audit_log import AuditLog
from app.db.models.user import User


def record_event(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: int | str | None = None,
    actor: User | None = None,
    request_id: str | None = None,
    ip_address: str | None = None,
    success: bool = True,
    details: dict[str, Any] | None = None,
    error_message: str | None = None,
) -> AuditLog:
    event = AuditLog(
        actor_user_id=actor.id if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        request_id=request_id or get_request_id(),
        ip_address=ip_address or get_client_ip(),
        success=success,
        details=details,
        error_message=error_message,
    )
    db.add(event)
    db.flush()
    return event
