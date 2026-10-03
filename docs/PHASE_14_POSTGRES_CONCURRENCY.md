# Phase 14 — PostgreSQL Concurrency Verification

## Objective

The order service uses:

```python
select(FoodOffer).where(...).with_for_update()
```

This is intended to lock the selected inventory rows inside the order transaction.

The important production property is:

> If only one unit remains, two concurrent customers must not both successfully purchase it.

## Integration test

File:

```
tests/test_postgres_concurrency.py
```

The test:

1. Creates two customers.
2. Creates one merchant.
3. Creates one food offer with exactly one available unit.
4. Starts two independent database sessions.
5. Attempts both orders concurrently.
6. Verifies exactly one order succeeds.
7. Verifies the other receives HTTP 409.
8. Verifies final inventory is zero.

The test intentionally uses PostgreSQL rather than SQLite because SQLite does not reproduce PostgreSQL row-lock semantics.

## Running locally

Set:

```text
POSTGRES_TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/nejat_e_ghaza_test
```

Then run:

```bash
pytest -q tests/test_postgres_concurrency.py
```

If the variable is not configured, the integration test is skipped.

## CI

GitHub Actions now starts PostgreSQL 16 as a service and runs the complete test suite.

Workflow:

```
.github/workflows/tests.yml
```

This means the concurrency test is not merely documentation: it is executed automatically in CI.

## Why this matters

A portfolio project should not merely claim:

"Inventory is protected against overselling."

This test provides executable evidence of the concurrency invariant.

## Remaining limitations

This test verifies the current PostgreSQL transaction/locking behavior for the single-offer overselling scenario. Production readiness still requires:

- transaction monitoring;
- database connection/pool configuration;
- retry strategy for transient database failures;
- payment idempotency;
- payment webhook verification;
- expiration workers;
- refund workflow;
- observability and alerting.
