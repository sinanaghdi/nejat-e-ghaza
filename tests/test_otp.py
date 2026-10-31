import pytest
from fastapi import HTTPException

from app.db.models.phone_otp import PhoneOTP
from app.services import otp as otp_service


class FakeSMSProvider:
    def __init__(self):
        self.sent: list[tuple[str, str]] = []

    def send_otp(self, phone_number: str, code: str) -> None:
        self.sent.append((phone_number, code))


def test_otp_model_has_partial_unique_index_for_active_phone():
    index = next(
        item
        for item in PhoneOTP.__table__.indexes
        if item.name == "uq_phone_otps_active_phone"
    )
    assert index.unique is True
    assert [column.name for column in index.columns] == ["phone_number"]
    assert "consumed_at IS NULL" in str(index.dialect_options["sqlite"]["where"])


def test_otp_request_cooldown_keeps_only_one_active_code(db, monkeypatch):
    provider = FakeSMSProvider()
    monkeypatch.setattr(otp_service, "get_sms_provider", lambda: provider)

    phone_number, code = otp_service.request_phone_otp(
        db,
        "09123456789",
        "کاربر آزمایشی",
    )

    assert phone_number == "09123456789"
    assert len(code) == 6
    assert provider.sent == [(phone_number, code)]

    active_codes = (
        db.query(PhoneOTP)
        .filter(
            PhoneOTP.phone_number == phone_number,
            PhoneOTP.consumed_at.is_(None),
        )
        .all()
    )
    assert len(active_codes) == 1
    assert active_codes[0].code_hash != code
    assert active_codes[0].code_hash == otp_service._code_hash(phone_number, code)

    with pytest.raises(HTTPException) as error:
        otp_service.request_phone_otp(db, phone_number, "کاربر آزمایشی")

    assert error.value.status_code == 429
    assert len(provider.sent) == 1
