# نجات غذا | Nejat-e-Ghaza

**A Persian-first food-surplus marketplace for Iran.**

نجات غذا به کافه‌ها، رستوران‌ها و فست‌فودها کمک می‌کند غذای مازاد قابل‌مصرف را با تخفیف عرضه کنند؛ مشتری پیشنهادهای موجود را می‌بیند، سفارش را رزرو و پرداخت می‌کند و در پنجره زمانی مشخص حضوری تحویل می‌گیرد.

> This repository is an MVP/portfolio implementation. Production SMS delivery, live gateway transactions, automatic provider-side split payments, and food-safety/dispute operations must be verified before a public pilot.

## What is implemented

- Persian RTL, responsive React + TypeScript interface.
- Search, city/price filters, nearby-offer discovery using merchant coordinates.
- Customer, merchant and admin dashboards.
- Orders, inventory reservation, pickup-code verification, and order expiry.
- Mobile OTP flow with hashed, expiring, one-time codes and rate limiting.
- Merchant verification and offer moderation with audit logs and notifications.
- ZarinPal request/callback/server-side verification adapter plus a mock provider for development.
- Decimal/Numeric commission ledger and manual merchant settlement tracking.
- PostgreSQL, Alembic, Redis, Celery, Docker Compose and GitHub Actions tests.

## Quick start

### Requirements

Python 3.12+, Node.js 20+, PostgreSQL, Redis and Git.

### 1. Configure the backend

```bash
git clone https://github.com/sinanaghdi/nejat-e-ghaza.git
cd nejat-e-ghaza
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

The checked-in `.env.example` is a **production-oriented template**, not ready-to-run credentials. For local development, set `ENVIRONMENT=development`, `PAYMENT_PROVIDER=mock`, `SMS_PROVIDER=mock`, `AUTH_COOKIE_SECURE=false`, and local PostgreSQL/Redis URLs. Never use mock providers in production.

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### 2. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite app is normally available at http://localhost:5173.

### Docker Compose

For the production-style stack, configure all required secrets and provider values in `.env`, then run:

```bash
docker compose up --build
```

The Compose file forces `ENVIRONMENT=production`; it will reject placeholder secrets and mock SMS/payment providers. Do not use this command with the example secrets unchanged.

## Authentication and payments

- Existing email/password auth is retained for compatibility; mobile OTP is available through `/api/auth/otp/request` and `/api/auth/otp/verify`.
- In local development, `SMS_PROVIDER=mock` returns a test-only `debug_code`. Production rejects the mock provider.
- The payment callback is not treated as proof of payment: the server verifies the authority and amount with the configured provider.
- Active payment attempts stay bound to the provider that issued their authority; unknown provider names never fall back to a mock gateway.
- If a verified charge arrives after an order was cancelled or expired, the order stays closed and the payment is marked `REFUND_REQUIRED`. The customer and admins are notified; admins can review `GET /api/admin/payments/refund-required` and record an already-completed manual refund through `PATCH /api/admin/payments/{payment_id}/refund-completed`.
- Refunds are **not automated**. An admin must complete the refund through the agreed provider/bank process before recording its reference in the system.
- A settlement records gross amount, commission and net payable. The current implementation **does not automatically transfer money or split a ZarinPal transaction**; an admin records a payout reference after a real bank transfer.

See [DEVELOPMENT.md](DEVELOPMENT.md) for current architecture, API routes and data model, and [SECURITY.md](SECURITY.md) for launch blockers.

## Tests

```bash
pytest -q
cd frontend
npm run typecheck
npm run build
npm run e2e
```

## Architecture decisions

- `SELECT ... FOR UPDATE` around inventory reservation to reduce overselling under concurrent orders.
- HttpOnly session cookie plus a separate CSRF token for browser sessions.
- OTP hashes and short expiry instead of storing raw verification codes.
- Decimal/Numeric for payment and commission calculations.
- Server-side gateway verification before marking payment paid.
- A settlement ledger with explicit manual payout tracking rather than claiming unsupported automatic split settlement.

Details: [Architecture decisions](docs/architecture-decisions.md).

## Repository topics

Suggested GitHub About topics: `fastapi`, `react`, `typescript`, `food-waste`, `marketplace`, `persian`, `postgresql`, `celery`, `otp-authentication`.

## License

See [LICENSE](LICENSE). The code is publicly viewable for portfolio review; no open-source reuse permission is granted by default.
