# نجات غذا | Nejat-e-Ghaza

**A Persian-first food-surplus marketplace for Iran.**

نجات غذا به کافه‌ها، رستوران‌ها و فست‌فودها کمک می‌کند غذای مازاد قابل‌مصرف را با تخفیف عرضه کنند؛ مشتری پیشنهادهای موجود را می‌بیند، سفارش را رزرو و پرداخت می‌کند و در پنجره زمانی مشخص حضوری تحویل می‌گیرد.

> This repository is an MVP/portfolio implementation. Production SMS delivery, live gateway transactions, automatic provider-side split payments, and food-safety/dispute operations must be verified before a public pilot.

## Project handbook

- [هندبوک فنی فارسی — منبع کامل و قابل ویرایش](docs/technical-handbook.fa.md)
- [دانلود هندبوک فنی فارسی — PDF](docs/Nejat-e-Ghaza-Technical-Handbook-FA.pdf) (پس از اجرای موفق workflow تولید PDF)
- [معماری و توسعه](DEVELOPMENT.md)
- [نقشه راه تولید](docs/production-roadmap.fa.md)
- [چک‌لیست آمادگی پایلوت](docs/pilot-readiness.md)
- [شرح وظایف و انتظارات همکاری مارکتینگ و برندینگ](docs/marketing-branding-brief.fa.md)
- [Runbook تأیید انتشار](docs/release-verification-runbook.md)

## What is implemented

- Persian RTL, responsive React + TypeScript interface.
- Search, city/price filters, nearby-offer discovery using merchant coordinates.
- Customer, merchant and admin dashboards.
- Orders, inventory reservation, pickup-code verification, and order expiry.
- Mobile OTP flow with hashed, expiring, one-time codes and rate limiting.
- Merchant verification and offer moderation with audit logs and notifications.
- ZarinPal request/callback/server-side verification adapter plus a mock provider for development.
- Decimal/Numeric commission ledger and manual merchant settlement tracking.
- Admin refund-review queue for verified late charges, with manual refund-reference reconciliation after the actual refund is processed.
- PostgreSQL, Alembic, Redis, Celery, Docker Compose and GitHub Actions tests.

## Policies and public demo

The public [GitHub Pages demo](https://sinanaghdi.github.io/nejat-e-ghaza/) uses seeded interface data and simulated roles; it does not make real purchases or payments. Do not enter real passwords, phone numbers, payment details, or other sensitive data into the demo.

The UI includes [Privacy](https://sinanaghdi.github.io/nejat-e-ghaza/#/privacy), [Terms](https://sinanaghdi.github.io/nejat-e-ghaza/#/terms), [Food safety and refunds](https://sinanaghdi.github.io/nejat-e-ghaza/#/safety), [Security](https://sinanaghdi.github.io/nejat-e-ghaza/#/security), and [License](https://sinanaghdi.github.io/nejat-e-ghaza/#/license) pages. These policy texts are MVP drafts, not final legal advice. The production owner/contact details, data-retention schedule, operational refund terms and applicable legal terms must be completed before a real public pilot.

See [SECURITY.md](SECURITY.md) for secret handling, secure configuration, and vulnerability disclosure. No production API key or password should be placed in source code. Frontend VITE_* values are public after build; keep secrets in backend environment variables or encrypted deployment secrets.

## Quick start

### Requirements

Python 3.12+, Node.js 24+, PostgreSQL, Redis and Git.

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

The checked-in .env.example is a **production-oriented template**, not ready-to-run credentials. For local development, set ENVIRONMENT=development, PAYMENT_PROVIDER=mock, SMS_PROVIDER=mock, AUTH_COOKIE_SECURE=false, and local PostgreSQL/Redis URLs. Never use mock providers in production.

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

For the production-style stack, configure all required secrets and provider values in .env, then run:

```bash
docker compose up --build
```

The Compose file forces ENVIRONMENT=production; it will reject placeholder secrets and mock SMS/payment providers. Do not use this command with the example secrets unchanged.

## Authentication and payments

- Existing email/password auth is retained for compatibility; mobile OTP is available through /api/auth/otp/request and /api/auth/otp/verify.
- In local development, SMS_PROVIDER=mock returns a test-only debug_code. Production rejects the mock provider.
- The payment callback is not treated as proof of payment: the server verifies the authority and amount with the configured provider.
- Active payment attempts stay bound to the provider that issued their authority; unknown provider names never fall back to a mock gateway.
- If a verified charge arrives after an order was cancelled or expired, the order stays closed and the payment is marked REFUND_REQUIRED. The customer and admins are notified; admins can review GET /api/admin/payments/refund-required and record an already-completed manual refund through PATCH /api/admin/payments/{payment_id}/refund-completed.
- Refunds are **not automated**. An admin must complete the refund through the agreed provider/bank process before recording its reference in the system.
- A settlement records gross amount, commission and net payable. The current implementation **does not automatically transfer money or split a ZarinPal transaction**; an admin records a payout reference after a real bank transfer.

## Tests

```bash
pytest -q
cd frontend
npm run typecheck
npm run build
npm run e2e
```

## Architecture decisions

- SELECT ... FOR UPDATE around inventory reservation to reduce overselling under concurrent orders.
- HttpOnly session cookie plus a separate CSRF token for browser sessions.
- OTP hashes and short expiry instead of storing raw verification codes.
- Decimal/Numeric for payment and commission calculations.
- Server-side gateway verification before marking payment paid.
- A settlement ledger with explicit manual payout tracking rather than claiming unsupported automatic split settlement.

Details: [Architecture decisions](docs/architecture-decisions.md).

## License

See [LICENSE](LICENSE). The code is publicly viewable for portfolio review; no open-source reuse permission is granted by default.
