from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.csrf import generate_csrf_token, set_csrf_cookie
from app.core.dependencies import get_current_user
from app.core.rate_limit import check_rate_limit
from app.core.security import create_access_token
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.auth import (
    CSRFResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import authenticate_user, register_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(
    request: Request,
    payload: RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
):
    check_rate_limit(request, "register")
    return register_user(db, payload.name, payload.email, payload.password)


@router.get("/csrf", response_model=CSRFResponse)
def csrf_token(response: Response):
    token = generate_csrf_token()
    set_csrf_cookie(response, token)
    return {"csrf_token": token}


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    check_rate_limit(request, "login")
    user = authenticate_user(db, payload.email, payload.password)

    access_token = create_access_token(str(user.id))
    csrf_token = generate_csrf_token()

    response.set_cookie(
        key=settings.auth_cookie_name,
        value=access_token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )
    set_csrf_cookie(response, csrf_token)

    return {
        "access_token": access_token if settings.expose_legacy_access_token else None,
        "token_type": "bearer",
        "csrf_token": csrf_token,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=settings.auth_cookie_name,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )
    return {"status": "logged_out"}


@router.get("/me", response_model=UserResponse)
def current_user(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
