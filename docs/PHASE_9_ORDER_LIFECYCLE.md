# Phase 9 — Payment & Order Lifecycle Foundation

## Order lifecycle

PENDING -> PAID -> READY_FOR_PICKUP -> COMPLETED

Cancellation is allowed from PENDING and PAID. Expiration is allowed from PENDING and READY_FOR_PICKUP.

Terminal states:
- COMPLETED
- CANCELLED
- EXPIRED

## API

PATCH /api/orders/{order_id}/status

The endpoint validates the current user's ownership/role and rejects invalid status transitions.

## Payment boundary

Real payment-gateway integration is intentionally not implemented yet. The PAID state is the domain boundary that a future payment service will trigger after a verified payment result.

This keeps payment-provider logic outside the order domain and prevents trusting a client-provided "paid" flag.
