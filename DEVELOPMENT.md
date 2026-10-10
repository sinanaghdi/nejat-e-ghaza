# Nejat-e-Ghaza — Architecture & Development

This document describes the implementation currently present in the repository. It is not a future-state plan. See [README.md](README.md) for the short product overview and local setup.

## Product boundary

Nejat-e-Ghaza is a food-surplus marketplace: merchants publish discounted end-of-day food offers, customers reserve and pay, then collect their orders during a pickup window. It is not a full restaurant POS/CRM.

The public demo uses in-memory seeded data. Production workflows require a deployed API, PostgreSQL, Redis, configured SMS and payment providers, and a public HTTPS callback URL.

## Architecture

```text
React + TypeScript + Vite
        | HTTP / session cookie / CSRF token
        v
FastAPI routes -> services -> repositories -> SQLAlchemy -> PostgreSQL
                       |               |
                       +-> audit log   +-> notification records
                       +-> payment provider
                       +-> settlement ledger
Celery worker -> expire overdue pending orders
Redis -> rate limits / Celery broker and result backend
Nginx -> reverse proxy / TLS termination
```

### Main layers

- `app/api/routes/`: HTTP routes, validation, role checks.
- `app/services/`: business rules, transactions, audit events, notifications.
- `app/repositories/`: persistence query helpers.
- `app/db/models/`: SQLAlchemy entities.
- `app/schemas/`: Pydantic request and response contracts.
- `app/core/`: settings, sessions, access control, CSRF, rate limiting.
- `frontend/src/`: Persian RTL React app; GitHub Pages runs Demo Mode.
- `alembic/versions/`: ordered database migrations.

## Current data model

| Table | Purpose / key fields |
|---|---|
| `users` | name, nullable unique email, nullable unique phone_number, nullable password_hash, role |
| `phone_otps` | HMAC-hashed one-time code, phone, expiry, attempts, consumed timestamp |
| `merchants` | business details, address/city, latitude/longitude, verification status/reason |
| `food_offers` | original/sale price, inventory, pickup window, active flag, moderation status/reason |
| `orders` | customer, merchant, total, status, pickup code |
| `order_items` | purchased quantities and historical unit price/subtotal |
| `payments` | provider, unique authority, amount, status, reference, timestamps |
| `merchant_settlements` | gross amount, commission rate, commission, net payable, payout reference and status |
| `notifications` | user-owned, read/unread, typed notifications |
| `audit_logs` | actor, action, entity, request ID, IP, structured details |

Prices and totals use SQL `NUMERIC(12, 2)` / Python `Decimal`. The app's payment amounts are denominated in **toman**; the ZarinPal adapter converts the amount to rial before sending it to the gateway. Do not convert money to binary floating point in backend calculations.

## Authentication and phone OTP

Existing email/password accounts remain supported for backwards compatibility. Phone OTP can create a customer account without an email or password; account linking between an existing email account and a new phone number is deliberately not automatic.

Endpoints:
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/auth/login` (legacy email/password)
- `POST /api/auth/register` (legacy email/password)

Iranian mobile input is normalized to `09xxxxxxxxx`. OTPs are six digits, expire after `OTP_TTL_SECONDS` (default 300 seconds), are stored as HMAC hashes, are one-time-use, and have a five-attempt limit. Redis rate limits protect requests per IP and phone. In development with `SMS_PROVIDER=mock`, the request response exposes `debug_code`; it is never returned in production.

Configuration:
- `SMS_PROVIDER=mock` for local development only, or `SMS_PROVIDER=kavenegar`.
- `KAVENEGAR_API_KEY` and `KAVENEGAR_OTP_TEMPLATE` when using Kavenegar.
- `OTP_TTL_SECONDS`, `OTP_RATE_LIMIT_PER_PHONE`, `OTP_RATE_LIMIT_WINDOW_SECONDS`.
- Production startup validation rejects the mock SMS provider and missing Kavenegar configuration.

Email-based authentication is retained until a production SMS account, OTP template, and verified mobile login are operational. Do not remove the compatibility path before existing users have a migration path.

## Offer approval and merchant verification

Merchant verification status is `PENDING`, `VERIFIED`, or `SUSPENDED`. Newly created merchant profiles start at `PENDING`. New offers start at `PENDING`; editing material content (title, description, prices, pickup window, image) sends an approved offer back for review.

Public browse and detail endpoints only expose offers that are active, in stock, not expired, belong to a `VERIFIED` merchant, and are `APPROVED`. The order creation service repeats the verification/moderation checks so a hidden offer cannot be purchased by calling the API directly.

Admin routes:
- `GET /api/admin/merchants`
- `PATCH /api/admin/merchants/{merchant_id}/verification`
- `GET /api/admin/offers/pending`
- `PATCH /api/admin/offers/{offer_id}/moderation`

Suspension and rejection require a reason. Decisions create audit events and merchant notifications. Migration `0006_moderation` preserves existing records as verified/approved while the defaults for new records are pending.

## Orders, inventory, and time

The normal lifecycle is:
- `PENDING -> PAID -> READY_FOR_PICKUP -> COMPLETED`
- `PENDING -> CANCELLED` or `PENDING -> EXPIRED`
- `READY_FOR_PICKUP -> EXPIRED` when the merchant misses the pickup deadline.

Inventory is reserved under a transaction with `SELECT ... FOR UPDATE`. Cancellation and pending-order expiry restore reserved quantity. The Celery task `app.workers.tasks.expire_pending_orders_task` calls `expire_pending_orders`; the expiration process checks payment state while holding locks in the same Order -> Payment order used by verification. A payment already confirmed as paid takes precedence over expiration and its inventory is not released.

Persist timestamps as timezone-aware UTC. API pickup datetimes must include an explicit UTC offset; the web UI should display dates in `Asia/Tehran`. Do not interpret a naive timestamp as local time. Model defaults use aware UTC timestamps; SQLite tests may return naive datetime values, so service comparisons normalize them.

Business-policy work still needed before a real pilot: customer no-show handling, merchant cancellation after payment, food-safety complaints/refunds, dispute ownership, and retention/refund windows. Do not silently treat these as ordinary order expiration.

## Payments and merchant settlements

Payment flow:
1. The server creates the payment with the selected provider and persists its authority.
2. The browser goes to the provider checkout.
3. The provider returns the customer to `GET /api/payments/zarinpal/callback` with `Authority`, `Status`, and the app's `order_id`.
4. The server verifies the authority and amount with ZarinPal before marking the order/payment paid. The gateway verification response—not the browser's return URL—is the payment truth source.

`POST /api/payments/webhook` is a separate internal/partner endpoint guarded by `X-Webhook-Secret`; that custom header is not presented as a ZarinPal-signed callback mechanism.

The merchant settlement ledger is created only after server-side payment verification:
- `PLATFORM_COMMISSION_BPS` defaults to `1000` (10%).
- Gross, commission, and net amounts are stored as Decimal/Numeric values.
- `GET /api/admin/settlements` reports settlement records.
- `PATCH /api/admin/settlements/{id}/paid` records a manual payout after a bank transfer and requires a payout reference.
- `GET /api/merchant/settlements` returns the logged-in merchant's own records.

**The current ledger does not automatically split or transfer money through ZarinPal.** The platform must reconcile a pending settlement and register the payout reference after the real transfer. Before launch, verify merchant payout/splitting eligibility and terms directly with the payment provider, agree the legal and accounting flow, and test with actual sandbox credentials. No live ZarinPal transaction has been verified from this repository environment.

## API areas

- Auth: `/api/auth`
- Offers: `/api/offers`
- Orders and pickup verification: `/api/orders`
- Payments/callback: `/api/payments`
- Merchant profile and settlements: `/api/merchant`
- Admin users, orders, moderation, settlements: `/api/admin`
- Notifications: `/api/notifications`
- Health: `/api/health` (see OpenAPI for the exact health response).

OpenAPI UI is available at `/docs` when the API server is running.

## Local development

1. Copy `.env.example` to `.env` and set local PostgreSQL/Redis values and a development JWT secret.
2. Install backend dependencies with `pip install -r requirements.txt`.
3. Apply migrations with `alembic upgrade head`.
4. Run API: `uvicorn app.main:app --reload`.
5. In another terminal, run the frontend: `cd frontend && npm install && npm run dev`.
6. Run tests: `pytest -q`; run frontend validation from `frontend/` with `npm run typecheck`, `npm run build`, and `npm run e2e`.

For production use `SECURITY.md` as a pre-launch checklist. Use real provider credentials only through environment secrets; never commit `.env`.
