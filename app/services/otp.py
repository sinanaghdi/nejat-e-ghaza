import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.request_context import get_request_id
from app.db.models.phone_otp import PhoneOTP
from app.db.models.user import User
from app.models.enums import UserRole
from app.repositories import user as user_repository
from app.services.audit import record_event
from app.services.sms_provider import get_sms_provider


def normalize_iran_mobile(value: str) -> str:
    numeral_map = str.maketrans(
        "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
        "01234567890123456789",
    )
    digits = re.sub(r"[\s\-()]", "", value.translate(numeral_map))
    if digits.startswith("+98"):
        digits = "0" + digits[3:]
    elif digits.startswith("0098"):
        digits = "0" + digits[4:]
    if not re.fullmatch(r"09\d{9}", digits):
        raise HTTPException(status_code=422, detail="شماره موبایل ایران معتبر نیست.")
    return digits


def _code_hash(phone_number: str, code: str) -> str:
    message = f"{phone_number}:{code}".encode("utf-8")
    return hmac.new(settings.jwt_secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def request_phone_otp(db: Session, phone_input: str, name: str | None) -> tuple[str, str]:
    phone_number = normalize_iran_mobile(phone_input)
    now = datetime.now(timezone.utc)

    # Serialize issuance by phone on PostgreSQL, including first-time requests
    # where no PhoneOTP row exists yet. The partial unique index below remains
    # the final integrity guard for all supported databases.
    if db.get_bind().dialect.name == "postgresql":
        db.execute(
            select(func.pg_advisory_xact_lock(func.hashtextextended(phone_number, 0)))
        )

    latest = db.scalar(
        select(PhoneOTP)
        .where(PhoneOTP.phone_number == phone_number)
        .order_by(PhoneOTP.created_at.desc(), PhoneOTP.id.desc())
        .limit(1)
    )
    if latest and _as_utc(latest.created_at) > now - timedelta(seconds=60) and latest.consumed_at is None:
        raise HTTPException(status_code=429, detail="برای دریافت کد جدید، ۶۰ ثانیه صبر کنید.")

    # Invalidate previous codes before creating a new one.
    active_codes = list(db.scalars(
        select(PhoneOTP)
        .where(
            PhoneOTP.phone_number == phone_number,
            PhoneOTP.consumed_at.is_(None),
        )
        .with_for_update()
    ).all())
    for item in active_codes:
        item.consumed_at = now

    code = f"{secrets.randbelow(1_000_000):06d}"
    otp = PhoneOTP(
        phone_number=phone_number,
        code_hash=_code_hash(phone_number, code),
        name=name.strip() if name and name.strip() else None,
        attempts=0,
        expires_at=now + timedelta(seconds=settings.otp_ttl_seconds),
        created_at=now,
    )
    db.add(otp)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # A concurrent issuer on a non-PostgreSQL backend may still race
        # between the active-code read and insert; normalize the unique-index
        # conflict into the same cooldown response instead of leaking a 500.
        raise HTTPException(
            status_code=429,
            detail="برای دریافت کد جدید، ۶۰ ثانیه صبر کنید.",
        ) from exc

    try:
        get_sms_provider().send_otp(phone_number, code)
    except Exception as exc:
        otp.consumed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=502, detail="ارسال پیامک ممکن نشد؛ بعداً دوباره تلاش کنید.") from exc

    return phone_number, code


def verify_phone_otp(db: Session, phone_input: str, submitted_code: str) -> User:
    phone_number = normalize_iran_mobile(phone_input)
    now = datetime.now(timezone.utc)
    otp = db.scalar(
        select(PhoneOTP)
        .where(
            PhoneOTP.phone_number == phone_number,
            PhoneOTP.consumed_at.is_(None),
        )
        .order_by(PhoneOTP.created_at.desc(), PhoneOTP.id.desc())
        .limit(1)
        .with_for_update()
    )
    if not otp or _as_utc(otp.expires_at) <= now:
        raise HTTPException(status_code=400, detail="کد نامعتبر یا منقضی شده است.")
    if otp.attempts >= 5:
        otp.consumed_at = now
        db.commit()
        raise HTTPException(status_code=429, detail="تعداد تلاش‌ها بیش از حد مجاز است؛ کد جدید بگیرید.")

    submitted_hash = _code_hash(phone_number, submitted_code)
    if not hmac.compare_digest(otp.code_hash, submitted_hash):
        otp.attempts += 1
        if otp.attempts >= 5:
            otp.consumed_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="کد نامعتبر یا منقضی شده است.")

    user = user_repository.get_by_phone(db, phone_number)
    if not user:
        user = User(
            name=otp.name or "کاربر نجات غذا",
            email=None,
            phone_number=phone_number,
            password_hash=None,
            role=UserRole.CUSTOMER,
        )
        db.add(user)
        db.flush()
    otp.consumed_at = now
    record_event(
        db,
        action="auth.phone_otp_verified",
        entity_type="user",
        entity_id=user.id,
        actor=user,
        request_id=get_request_id(),
        details={"method": "phone_otp"},
    )
    db.commit()
    db.refresh(user)
    return user
