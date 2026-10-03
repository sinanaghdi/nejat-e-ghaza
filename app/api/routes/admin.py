from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db.database import get_db
from app.db.models.user import User
from app.models.enums import UserRole
from app.schemas.user import RoleUpdate, UserAdminResponse
from app.services import admin as admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserAdminResponse])
def list_users(
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.list_users(db)


@router.patch("/users/{user_id}/role", response_model=UserAdminResponse)
def update_role(
    user_id: int,
    payload: RoleUpdate,
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return admin_service.update_user_role(db, user_id, payload.role, current_user)
