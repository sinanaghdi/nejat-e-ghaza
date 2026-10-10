import re

from app.db.models.phone_otp import PhoneOTP
from app.db.models.user import User


def test_phone_otp_creates_phone_first_account_and_sets_session(client, db):
    requested = client.post(
        "/api/auth/otp/request",
        json={"phone_number": "+989123456789", "name": "مشتری پیامکی"},
    )
    assert requested.status_code == 200
    body = requested.json()
    assert body["expires_in_seconds"] == 300
    assert re.fullmatch(r"\d{6}", body["debug_code"])

    verified = client.post(
        "/api/auth/otp/verify",
        json={"phone_number": "09123456789", "code": body["debug_code"]},
    )
    assert verified.status_code == 200
    assert verified.json()["csrf_token"]
    assert "nejat_e_ghaza_session" in verified.cookies

    user = db.query(User).filter(User.phone_number == "09123456789").one()
    assert user.email is None
    assert user.password_hash is None
    assert user.name == "مشتری پیامکی"
    assert user.role.value == "CUSTOMER"


def test_phone_otp_is_one_time_and_wrong_code_attempts_are_counted(client, db):
    requested = client.post(
        "/api/auth/otp/request",
        json={"phone_number": "09123456789", "name": "مشتری"},
    )
    assert requested.status_code == 200
    code = requested.json()["debug_code"]

    wrong = client.post(
        "/api/auth/otp/verify",
        json={"phone_number": "09123456789", "code": "000000" if code != "000000" else "000001"},
    )
    assert wrong.status_code == 400
    otp = db.query(PhoneOTP).one()
    assert otp.attempts == 1
    assert otp.consumed_at is None

    success = client.post(
        "/api/auth/otp/verify",
        json={"phone_number": "09123456789", "code": code},
    )
    assert success.status_code == 200

    reuse = client.post(
        "/api/auth/otp/verify",
        json={"phone_number": "09123456789", "code": code},
    )
    assert reuse.status_code == 400


def test_phone_otp_rejects_invalid_iran_mobile(client):
    response = client.post(
        "/api/auth/otp/request",
        json={"phone_number": "12345", "name": "مشتری"},
    )
    assert response.status_code == 422
