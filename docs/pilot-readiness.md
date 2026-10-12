# Pilot Readiness Plan

**Status:** planning and verification checklist — not evidence that production services are configured or that live transactions have passed.

This document turns the current MVP into a controlled, measurable pilot. Keep the pilot blocked until every mandatory gate below has an owner and evidence.

## Current release boundary

- The GitHub Pages site is a seeded frontend demo; it is not a production marketplace.
- Live SMS delivery, live payment transactions, production infrastructure, and merchant payouts have not been verified by this repository document.
- The settlement ledger records amounts and manual payout references; it does not transfer funds or split a gateway payment.
- Food safety, refund/no-show handling, and merchant operational agreements require explicit decisions before real customers are onboarded.

## Phase A — Repeatable verification

Run from a clean checkout using Python 3.12, Node.js 20, PostgreSQL, and Redis.

- [ ] Apply all migrations to a newly created PostgreSQL database.
- [ ] Run `pytest -q`; save the command output and CI run URL.
- [ ] In `frontend/`, run `npm ci` (if a lockfile is committed), `npm run typecheck`, `npm run build`, and `npm run e2e`.
- [ ] Verify the GitHub Actions test workflow succeeds on a fresh push and pull request.
- [ ] Verify the GitHub Pages workflow succeeds and the deployed demo loads from the repository subpath.
- [ ] Confirm demo data and role markers cannot be mistaken for real accounts, inventory, orders, or payments.
- [ ] Exercise the app at mobile and desktop widths, with keyboard navigation and Persian RTL text.

### Required order and inventory scenarios

- [ ] A valid, approved, non-expired offer from a verified merchant can be ordered.
- [ ] An expired, unapproved, inactive, or out-of-stock offer is rejected at checkout.
- [ ] Two concurrent checkouts competing for the final unit cannot both reserve it.
- [ ] Failed or abandoned payment does not mark an order as paid.
- [ ] A successful provider verification marks payment/order once; repeated callbacks remain idempotent.
- [ ] Expired unpaid reservations release stock according to the documented implementation.
- [ ] Pickup code works only for the correct eligible order and cannot be reused to complete it twice.
- [ ] Merchant and admin routes reject unauthorized roles; customer data is scoped to its owner.
- [ ] Cookie-authenticated state-changing requests reject missing or invalid CSRF tokens.
- [ ] OTP expires, is one-time-use, has an attempt limit, and is rate-limited by phone and IP.

**Evidence rule:** record actual command output, workflow URLs, and reproducible steps. Do not mark a test complete because the code appears to implement it.

## Phase B — Pilot policy decisions

Write down and approve each policy before inviting merchants:

- [ ] Eligible foods and prohibited items; handling, storage, allergen and expiry requirements.
- [ ] Merchant responsibility for preparation, storage, packaging, and pickup handover.
- [ ] Pickup-window rules and customer no-show handling.
- [ ] Merchant cancellation after payment, customer cancellation, refund eligibility, and refund timing.
- [ ] Complaint/dispute process, support contact, evidence retention, and escalation owner.
- [ ] Commission rate, settlement cadence, minimum payout, reconciliation process, and accounting owner.
- [ ] Offer accuracy rules: quantity, contents, allergens, original price, discounted price, and pickup deadline.
- [ ] Privacy notice, phone-number use/retention, account deletion, and operational access controls.
- [ ] Pilot geography, opening hours, merchant onboarding checklist, daily support owner, and incident response contact.

Do not make legal or food-safety compliance claims without review against the applicable local requirements.

## Phase C — Production infrastructure gate

- [ ] Deploy API, PostgreSQL, Redis, and Celery worker/beat to managed or hardened infrastructure.
- [ ] Configure HTTPS, exact allowed frontend origins, secure session cookies, CSRF settings, and public callback URLs.
- [ ] Use unique production secrets from a secret manager; never commit real credentials.
- [ ] Configure the real SMS provider and approved OTP template; verify delivery, expiry, retries, and cost controls.
- [ ] Configure the selected payment product and confirm the provider's current contract, fees, refund support, and merchant eligibility.
- [ ] Complete a low-value end-to-end payment in the provider's approved test environment, then a controlled live transaction before public launch.
- [ ] Verify callback amount/authority handling, duplicate callbacks, timeout recovery, failed payments, and reconciliation.
- [ ] Configure database backups and perform a restore drill; document migration and release rollback.
- [ ] Add error reporting, structured logs, uptime/worker/queue alerts, payment reconciliation alerts, and incident ownership.
- [ ] Run dependency and secret scans; review logs to ensure OTPs, tokens, and sensitive personal data are not leaked.
- [ ] Load-test order reservation and rate limits with realistic expected pilot traffic.

## Phase D — Limited pilot and go/no-go

Start with a small, manually verified group of merchants and a capped number of offers. Keep support and settlement manual until evidence supports automation.

Track daily:
- published offers and sell-through rate;
- order completion and pickup no-show rate;
- cancellations, refunds, complaints, and food-safety incidents;
- payment verification failures and reconciliation differences;
- merchant settlement balance and age of unpaid balances;
- repeat customers and merchant retention.

**Go only when:** all mandatory security and payment gates pass, food/pickup/refund policies are published, support is staffed, and the team can reconcile every order and payment. Any unresolved food-safety incident, unexplained payment mismatch, or unauthorized data exposure is a stop condition.

## Decision log

| Decision | Required owner | Status |
|---|---|---|
| Pilot city and participating merchants | Product/operations | Open |
| Food eligibility and safety procedure | Operations + qualified local review | Open |
| Refund, cancellation, and no-show policy | Product + finance/legal review | Open |
| Commission and settlement cadence | Product + finance | Open |
| SMS and payment provider production access | Engineering/operations | Open |
| Hosting, backups, monitoring, and incident response | Engineering | Open |

## Next engineering milestone

Complete Phase A on a clean environment, fix every reproducible failure, and attach evidence to the relevant GitHub commit or issue. Only then proceed to provider credentials and production deployment.
