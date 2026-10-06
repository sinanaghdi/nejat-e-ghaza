from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload


from app.core.request_context import get_request_id
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import user as user_repository
from app.services.audit import record_event


def list_users(db: Session) -> list[User]:
    return user_repository.list_users(db)


def update_user_role(db: Session, target_user_id: int, role: UserRole, actor: User | None = None) -> User:
    user = user_repository.get_by_id(db, target_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.ADMIN and role != UserRole.ADMIN:
        raise HTTPException(status_code=409, detail="Admin role cannot be removed through this endpoint")

    previous_role = user.role
    user.role = role
    record_event(
        db,
        action="user.role_changed",
        entity_type="user",
        entity_id=user.id,
        actor=actor,
        request_id=get_request_id(),
        details={"from_role": previous_role.value, "to_role": role.value},
    )
    db.commit()
    db.refresh(user)
    return user


def list_orders(db: Session):
    from app.db.models.order import Order
    statement = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(100)
    )
    return list(db.scalars(statement).all())
