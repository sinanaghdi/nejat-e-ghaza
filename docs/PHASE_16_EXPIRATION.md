# Phase 16 — Order Expiration & Background Jobs

## Goal

Pending orders reserve inventory immediately. If a customer does not complete payment within the configured window, the reservation must expire and the inventory must be returned.

## Policy

- Only PENDING orders are eligible for automatic expiration.
- The expiration window is configured with ORDER_PAYMENT_TIMEOUT_MINUTES.
- Expiration restores every order item's quantity to its food offer.
- The operation is transactional.
- Running the job multiple times is safe because the query only selects still-pending orders.
- Paid, completed, cancelled, and already-expired orders are never modified by the expiration job.

## Runtime

Celery Beat -> Redis -> Celery Worker -> expire_pending_orders()

The task locks eligible pending orders, restores inventory, marks them EXPIRED, and commits the transaction.

## Configuration

REDIS_URL=redis://redis:6379/0
ORDER_PAYMENT_TIMEOUT_MINUTES=15

For local development without Docker, Redis must be reachable at the configured URL.

## Docker services

- api: FastAPI application
- db: PostgreSQL
- redis: Redis broker/backend
- worker: Celery worker
- beat: Celery Beat scheduler

The API container does not execute background jobs itself.

## Idempotency

The expiration query filters on Order.status == PENDING. After the transaction changes the order to EXPIRED, a later run will not select it again.

## Operational notes

The job should be monitored in production. A future production setup can add structured task logs, metrics, retries, and a dedicated job/lock strategy if multiple worker fleets are introduced.
