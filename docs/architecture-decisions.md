# Architecture Decisions

## 1. Reserve inventory in a database transaction

Order creation selects requested offers with row locks ('SELECT ... FOR UPDATE'), validates their current visibility and stock, decrements inventory, and creates the order in one transaction.

**Why:** inventory is scarce and concurrent requests must not sell the same unit twice. In-memory locks would not protect multiple API workers or containers. PostgreSQL concurrency tests are the production-grade verification target; SQLite lock behavior is not equivalent.

## 2. Verify payments server-side

A callback URL is only a signal to start verification. The API verifies the saved authority and amount with the selected provider before moving payment/order to 'PAID'. Duplicate callbacks are idempotent.

**Why:** a client query parameter or redirect is not proof of payment. The current code has a provider adapter and test doubles, but live/sandbox credentials and a real transaction have not been verified in this environment.

## 3. HttpOnly session cookie plus CSRF token

Browser sessions use an HttpOnly access-token cookie. Mutating requests use a separate CSRF cookie and matching request header. The bearer-token path remains for non-browser compatibility and tests.

**Why:** JavaScript cannot read the HttpOnly session value, reducing exposure to token theft via XSS. Cookie-based authentication requires CSRF protection because browsers attach cookies automatically.

## 4. Phone OTP is hashed and one-time

OTP codes are six digits, expire after five minutes by default, are stored as keyed HMAC hashes, and are invalidated after successful verification. The backend limits attempts, adds Redis rate limits per IP and phone, and never returns a real production code.

**Why:** storing a raw code or allowing unlimited attempts would make phone login easier to abuse. Mock SMS is strictly development-only. Connecting a Kavenegar account and validating delivery is still an operational task.

## 5. Decimal money and explicit currency conversion

Offer prices, order totals, payment amounts, commission and settlement values use Decimal and SQL NUMERIC(12, 2). App values are in toman; the ZarinPal adapter converts to rial at the provider boundary.

**Why:** binary floating point is not appropriate for financial arithmetic, and currency conversion must happen in one clearly defined layer.

## 6. Settlement ledger is separate from transfer execution

After verified payment, the system records gross amount, commission basis points, commission, and net merchant payable. An admin can record a completed bank transfer with a reference. The ledger does not move funds itself.

**Why:** a payout report and a real money transfer are different operations. The repository does not assume that the merchant's ZarinPal setup supports automatic transaction splitting. Confirm eligibility, contracts, fees, payout API, and accounting treatment with the provider before building automatic settlement.

## 7. Merchant and offer moderation are enforced in services

New merchant profiles and offers enter PENDING; an admin verifies merchants and reviews offers. Public browse/detail and order creation both enforce verified/approved state, and decisions create audit logs and notifications.

**Why:** hiding a card in React is not authorization. Server-side checks are necessary to prevent direct API calls from buying an unapproved offer.

## Remaining pilot risks

- Define legal/accounting treatment and refund rules for pickup no-shows, merchant cancellation after payment, refunds, food safety complaints and disputes. The implemented pickup-window expiry deliberately does not relist food or initiate refunds/payouts.
- Run real SMS delivery tests and a ZarinPal sandbox transaction on a public HTTPS domain.
- Confirm whether payout/splitting is available for the exact merchant/platform arrangement; the manual settlement ledger is not an automated payout.
- Add actual customer/merchant/admin screenshots from a tested deployment; repository images must reflect the current product, not mocked screenshots.
