from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.request_context import get_request_id
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import user as user_repository
from app.core.security import create_access_token, hash_password, verify_password
from app.services.audit import record_event


def register_user(db: Session, name: str, email: str, password: str, role: UserRole = UserRole.CUSTOMER) -> User:
    if user_repository.get_by_email(db, email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(name=name, email=email, password_hash=hash_password(password), role=role)
    created = user_repository.create(db, user)
    record_event(
        db,
        action="auth.registered",
        entity_type="user",
        entity_id=created.id,
        actor=created,
        request_id=get_request_id(),
    )
    db.commit()
    db.refresh(created)
    return created


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = user_repository.get_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def login_user(db: Session, email: str, password: str) -> str:
    user = authenticate_user(db, email, password)
    record_event(
        db,
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
        actor=user,
        request_id=get_request_id(),
    )
    db.commit()
    return create_access_token(str(user.id))
