from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import user as user_repository

def list_users(db: Session) -> list[User]:
    return user_repository.list_users(db)

def update_user_role(db: Session, target_user_id: int, role: UserRole) -> User:
    user = user_repository.get_by_id(db, target_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.ADMIN and role != UserRole.ADMIN:
        raise HTTPException(status_code=409, detail="Admin role cannot be removed through this endpoint")
    user.role = role
    db.commit()
    db.refresh(user)
    return user
