# Phase 22 — Launch Readiness and Verification

**Status:** readiness review; not a production approval  
**Reviewed:** 2026-10-16  
**Base revision reviewed:** cb85d5e9edb728986ff23c665ffa79873dfbc401 (main)

This document turns the current implementation into a concrete, evidence-based checklist for the next release. It intentionally distinguishes features implemented in code from integrations and operating procedures that still require real-world verification.

## Current repository evidence

- The repository contains a FastAPI application, SQLAlchemy models, Alembic migrations, a React + TypeScript frontend, PostgreSQL/Redis/Celery configuration, Dockerfiles, and GitHub Actions workflows.
- The frontend has separate customer, merchant, admin, checkout, order, notification, legal, and payment-result routes/pages.
- The backend includes order and inventory handling, OTP authentication, offer moderation, audit events, notifications, payment-provider adapters, and merchant settlement records.
- The public GitHub Pages deployment is a **simulated demo**. It uses seeded data and simulated roles/payments; it must not be represented as a live marketplace.
- The payment implementation supports a ZarinPal adapter and a mock development provider. A verified payment can still require manual refund handling if the order has expired or been cancelled.
- Merchant settlements are recorded in the application; the repository documentation explicitly states that payouts are not automatically transferred or split by the payment gateway.

## CI evidence at review time

The latest observed main workflow runs for revision cb85d5e9edb728986ff23c665ffa79873dfbc401 were successful:

- [Backend and frontend tests](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/38302595654)
- [Python application workflow](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/38302595657)
- [GitHub Pages deployment](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/38302595692)
- [Secret scanning](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/38302595665)

These results show that the configured workflows passed for that revision. They do **not** prove that production credentials, a live payment account, SMS delivery, refunds, settlement transfers, or a deployed PostgreSQL service have been validated end to end.

## Release gates

### Gate A — Backend and database

- [ ] Run the full test suite against the exact release commit: pytest -q.
- [ ] Verify migrations on a clean PostgreSQL database: alembic upgrade head.
- [ ] Verify an upgrade from the previous release schema and document the rollback/recovery approach.
- [ ] Confirm concurrent reservations cannot oversell the same offer using PostgreSQL-backed tests.
- [ ] Confirm expiry workers and payment verification handle races without reopening a closed order.
- [ ] Confirm database backups and a restore drill are documented for the target host.

### Gate B — Authentication and operations

- [ ] Configure a real SMS provider and verify OTP delivery, expiry, one-time use, throttling, and abuse monitoring.
- [ ] Confirm production cookies are Secure and HttpOnly, CSRF protection is enabled, and only trusted HTTPS origins are allowed.
- [ ] Confirm the bootstrap admin is created securely, can sign in, and cannot be provisioned with example credentials.
- [ ] Check logs for secrets, OTP values, access tokens, and unnecessary personal data.
- [ ] Define an operational owner and response procedure for fraud, account compromise, food-safety complaints, and support requests.

### Gate C — Real payments

- [ ] Use the payment provider sandbox to test success, cancellation, invalid authority, duplicate callback, provider timeout, and amount mismatch.
- [ ] Verify the amount and authority against the provider server-side; never trust a browser redirect as proof of payment.
- [ ] Test the late-success case where an order expires or is cancelled while the customer is at the gateway.
- [ ] Exercise the refund-review queue and verify a refund is recorded only after the actual refund has been completed with the provider/bank.
- [ ] Configure the production merchant account, HTTPS callback URL, and production secrets in the deployment environment—not in source control.
- [ ] Reconcile a real test transaction from gateway reference to order, payment, commission ledger, and merchant payable.
- [ ] Document that merchant payouts are manual until an actual, supported payout integration exists.

### Gate D — Frontend and release

- [ ] Run cd frontend && npm run typecheck && npm run build && npm run e2e.
- [ ] Verify customer, merchant, and admin journeys on desktop and mobile-sized viewports.
- [ ] Verify loading, empty, validation, expired-offer, out-of-stock, payment-failure, refund-review, and network-error states.
- [ ] Ensure the GitHub Pages demo is clearly labelled simulated and never collects real credentials or payment details.
- [ ] Verify the deployed frontend is configured for the intended API URL; do not mistake a Pages demo build for a production deployment.
- [ ] Complete privacy, retention, terms, refund, food-safety, merchant verification, and customer support details for the actual pilot jurisdiction.
- [ ] Perform a release smoke test against the deployed API and record the exact release SHA and results.

## Recommended next implementation order

1. **Sandbox payment acceptance test:** add or strengthen an end-to-end test that exercises the full payment lifecycle and duplicate/late callbacks against PostgreSQL.
2. **Deployment configuration review:** verify the target host, environment variables, health checks, migrations, and secure secret injection.
3. **Operational settlement and refund workflow:** make reconciliation states and admin actions auditable, then test the workflow end to end.
4. **Pilot runbook:** document merchant onboarding, food safety, pickup disputes, refunds, support ownership, and incident escalation.
5. **Production go/no-go:** only proceed after the release gates above have evidence, not just checked boxes.

## Definition of done

A release is ready for a controlled pilot only when the automated checks pass on the release commit, the deployment has been smoke-tested, real provider integrations have been verified in the intended environment, and each manual payment/refund/food-safety operation has an accountable owner and written procedure.