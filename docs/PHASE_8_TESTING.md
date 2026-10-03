# Phase 8 — Testing

## Coverage

The test suite covers the main backend authorization and business rules introduced in Phases 3–7.

### Authentication
- Customer registration succeeds.
- Duplicate email registration is rejected.
- Login returns a bearer access token.

### Authorization
- Customers cannot create merchant offers.
- Customers cannot access admin endpoints.
- Admins can promote a customer to merchant.

### Orders
- Successful orders reduce available inventory.
- Order totals are calculated from the stored sale price.
- Orders exceeding available inventory are rejected.

## Test isolation

Tests use a separate SQLite database and FastAPI dependency override for the database session. Production PostgreSQL is not modified by the test suite.

## Important limitation

SQLite does not reproduce PostgreSQL row-lock behavior exactly. The production order path still uses SELECT FOR UPDATE; a PostgreSQL integration/concurrency test should be added before treating overselling protection as production-verified.
