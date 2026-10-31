import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.csrf import generate_csrf_token, set_csrf_cookie
from app.core.dependencies import get_current_user
from app.core.rate_limit import check_rate_limit
from app.core.security import create_access_token
from app.core.request_context import get_request_id
from app.services.audit import record_event
from app.services.otp import normalize_iran_mobile, request_phone_otp, verify_phone_otp
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.auth import (
    CSRFResponse,
    LoginRequest,
    OTPRequest,
    OTPRequestResponse,
    OTPVerifyRequest,
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
    check_rate_limit(request, "register-ip", limit=10, window_seconds=3600)
    email_bucket = hashlib.sha256(str(payload.email).strip().lower().encode("utf-8")).hexdigest()[:24]
    check_rate_limit(
        request,
        f"register-email:{email_bucket}",
        limit=5,
        window_seconds=86400,
        scope="global",
    )
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
    check_rate_limit(request, "login-ip", limit=20, window_seconds=900)
    email_bucket = hashlib.sha256(str(payload.email).strip().lower().encode("utf-8")).hexdigest()[:24]
    check_rate_limit(
        request,
        f"login-email:{email_bucket}",
        limit=10,
        window_seconds=900,
        scope="global",
    )
    user = authenticate_user(db, payload.email, payload.password)
    record_event(
        db,
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
        actor=user,
        request_id=get_request_id(),
    )
    db.commit()

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




@router.post("/otp/request", response_model=OTPRequestResponse)
def request_otp(
    request: Request,
    payload: OTPRequest,
    db: Annotated[Session, Depends(get_db)],
):
    phone_number = normalize_iran_mobile(payload.phone_number)
    check_rate_limit(request, "otp-request-ip", limit=10, window_seconds=3600)
    phone_bucket = hashlib.sha256(phone_number.encode("utf-8")).hexdigest()[:24]
    check_rate_limit(
        request,
        f"otp-request-phone:{phone_bucket}",
        limit=settings.otp_rate_limit_per_phone,
        window_seconds=settings.otp_rate_limit_window_seconds,
        scope="global",
    )
    _, code = request_phone_otp(db, phone_number, payload.name)
    debug_code = code if settings.environment.lower() != "production" and settings.sms_provider == "mock" else None
    return {
        "message": "اگر ارسال پیامک امکان‌پذیر باشد، کد ورود ارسال می‌شود.",
        "expires_in_seconds": settings.otp_ttl_seconds,
        "debug_code": debug_code,
    }


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(
    request: Request,
    response: Response,
    payload: OTPVerifyRequest,
    db: Annotated[Session, Depends(get_db)],
):
    phone_number = normalize_iran_mobile(payload.phone_number)
    check_rate_limit(request, "otp-verify-ip", limit=30, window_seconds=3600)
    phone_bucket = hashlib.sha256(phone_number.encode("utf-8")).hexdigest()[:24]
    check_rate_limit(
        request,
        f"otp-verify-phone:{phone_bucket}",
        limit=15,
        window_seconds=3600,
        scope="global",
    )

    user = verify_phone_otp(db, phone_number, payload.code)
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
    response.delete_cookie(key=settings.auth_cookie_name, path="/")
    response.delete_cookie(key=settings.csrf_cookie_name, path="/")
    return {"status": "logged_out"}


@router.get("/me", response_model=UserResponse)
def current_user(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
