# Release Verification Runbook

Use this runbook before calling a release candidate test-verified. A successful source-code edit or committed test is not the same as a passing test run.

## Clean checkout

From the repository root, use Python 3.12 and Node.js 24. In PowerShell:

```powershell
git clone https://github.com/sinanaghdi/nejat-e-ghaza.git
cd nejat-e-ghaza
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Configure a local development `.env` with a development-only JWT secret, local PostgreSQL/Redis, `ENVIRONMENT=development`, `SMS_PROVIDER=mock`, and `PAYMENT_PROVIDER=mock`. Never reuse these settings in production.

Start PostgreSQL and Redis, then apply migrations and run backend tests:

```powershell
alembic upgrade head
pytest -q
```

Run frontend checks from the frontend directory:

```powershell
cd frontend
npm install
npm run typecheck
npm run build
npx playwright install chromium
npm run e2e
```

## Required automated evidence

The `Tests` GitHub Actions workflow should report success for all three jobs:

1. `unit-and-integration`: backend tests against the configured CI test database.
2. `frontend-build`: dependency audit, TypeScript typecheck, production build, and Playwright E2E.
3. `production-docker-build`: build both production container images without deploying them.

The browser-test build should leave `VITE_DEMO_MODE` unset or false so Playwright's mocked API routes exercise the real API client path. GitHub Pages uses its own demo-enabled workflow. Demo credentials and seeded data are UI fixtures only and are not live accounts, orders, or payments.

E2E-specific expectations:
- Customer login redirects to a role dashboard. Customer journey tests must navigate back to `/#/offers` before selecting an offer card.
- Refund-review browser tests should mock the API endpoint responses and native confirm/prompt dialogs, then assert the refund request reached the mocked endpoint and the review queue became empty.

## Payment and order regression checklist

- [ ] Unknown SMS/payment provider names cause configuration failure; payment provider selection never silently falls back to mock.
- [ ] Payment attempt authority remains bound to the provider that created it.
- [ ] Customer/merchant/admin cannot mark an unpaid order `PAID` through the generic order-status endpoint.
- [ ] A verified charge received after cancellation/expiry is stored as `REFUND_REQUIRED`; the order remains closed and no merchant settlement is created.
- [ ] Only admins can access the refund queue or record a refund reference.
- [ ] Repeated callbacks and repeated refund reconciliation do not duplicate records or change the closed order.
- [ ] The demo refund-review E2E can open the admin queue and remove a sample item after a mock manual-reference entry.

## How to record a test result

For each execution, record the commit SHA, workflow URL, job name, result, and failure summary. Mark a gate complete only when the corresponding run result is visible and successful. If an action cannot be reached from the current environment, report it as **not verified**, not passed.

## Production boundary

Passing these checks still does not configure a real SMS account, payment merchant credentials, HTTPS callback, hosting, backups, monitoring, or operational food-safety/refund policy. Those remain separate production go/no-go gates; consult [SECURITY.md](../SECURITY.md) and [the pilot readiness plan](pilot-readiness.md).
