from decimal import Decimal

from app.services.payment_provider import ZarinpalPaymentProvider


def test_zarinpal_converts_toman_to_rial():
    assert ZarinpalPaymentProvider._rial_amount(Decimal("125000")) == 1250000


def test_zarinpal_verify_accepts_already_verified(monkeypatch):
    provider = ZarinpalPaymentProvider()

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": {"code": 101, "ref_id": 987654}}

    monkeypatch.setattr(
        "app.services.payment_provider.requests.post",
        lambda *args, **kwargs: Response(),
    )

    result = provider.verify("AUTH-123", Decimal("10000"))

    assert result.success is True
    assert result.reference_id == "987654"


def test_zarinpal_request_extracts_authority(monkeypatch):
    provider = ZarinpalPaymentProvider()

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": {"code": 100, "authority": "AUTH-123"}, "errors": []}

    monkeypatch.setattr(
        "app.services.payment_provider.requests.post",
        lambda *args, **kwargs: Response(),
    )

    result = provider.start(
        type("Request", (), {"amount": Decimal("10000"), "order_id": 42})()
    )

    assert result.authority == "AUTH-123"
    assert result.checkout_url.endswith("/AUTH-123")
