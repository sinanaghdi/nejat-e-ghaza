# Phase 13 — Order Security & Payment Boundary

## Goals

- Keep order status changes actor-specific.
- Prevent customers and merchants from setting `PAID`.
- Restore reserved inventory when a pending order is cancelled.
- Avoid treating a client-supplied status as proof of payment.
- Keep real payment/refund integration as a separate domain boundary.

## Status ownership

| Transition | Allowed actor |
|---|---|
| PENDING → PAID | Verified payment integration only |
| PENDING → CANCELLED | Customer or merchant |
| PENDING → EXPIRED | Admin / expiration worker |
| PAID → READY_FOR_PICKUP | Merchant |
| READY_FOR_PICKUP → COMPLETED | Merchant |
| READY_FOR_PICKUP → EXPIRED | Admin / expiration worker |
| Other terminal transitions | Not available through the generic customer/merchant endpoint |

The current generic status endpoint deliberately does **not** expose a payment transition to customers or merchants.

## Cancellation and inventory

When a `PENDING` order is cancelled, every reserved item quantity is returned to its food offer.

A paid-order cancellation is intentionally blocked for now. A production implementation must coordinate:

1. payment-provider refund;
2. refund result verification;
3. inventory policy;
4. order status update;
5. idempotency.

These operations should not be simulated by accepting `CANCELLED` from an arbitrary client.

## Payment architecture — next step

The next payment phase should introduce a provider abstraction such as:

```
PaymentService
    ↓
PaymentProvider interface
    ↓
ZarinPal / IDPay / MockProvider
```

The provider callback/webhook should be the only path that can transition:

```
PENDING → PAID
```

The callback must verify the provider response server-side and be idempotent.

## Current limitation

No real payment gateway is implemented yet. Therefore `PAID` is a domain state, not a claim that money has actually been received.

## Test coverage added

- Customer cannot mark an order as `PAID`.
- Merchant cannot mark an order as `PAID`.
- Merchant can move a genuinely paid order to `READY_FOR_PICKUP`.
- Merchant cannot complete an unpaid order.
- Pending cancellation restores inventory.
- Paid-order cancellation is blocked until refund architecture exists.
