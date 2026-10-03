# Phase 15 — Payment Architecture

## What was implemented

The project now has a real payment domain boundary without pretending that a real gateway is connected.

### Flow

```
Customer
   ↓
POST /api/orders
   ↓
PENDING
   ↓
POST /api/payments/orders/{order_id}
   ↓
Payment record + authority
   ↓
Payment Provider
   ↓
POST /api/payments/webhook
   ↓
Server-side verification
   ↓
Payment = PAID
Order = PAID
   ↓
Merchant
   ↓
READY_FOR_PICKUP
```

## Provider abstraction

Payment logic is separated from the API through:

```
PaymentProvider
├── start()
└── verify()

MockPaymentProvider
```

A real provider such as a production Iranian payment gateway can later implement the same interface.

The API does not directly contain gateway-specific logic.

## Payment persistence

A dedicated `payments` table was added:

- order_id — one payment record per order
- provider
- authority
- reference_id
- amount
- status
- created_at
- paid_at

Migration:

```
alembic/versions/0002_payments.py
```

## Idempotency

Repeated webhook calls for an already-paid payment return the existing paid payment rather than changing the order again.

The payment row is locked during verification to reduce duplicate concurrent processing.

The order is locked while creating a payment to protect the one-payment-per-order invariant.

## Security boundary

Customers can create a payment for their own pending order.

Customers and merchants still cannot set:

```
PENDING → PAID
```

through the generic order status endpoint.

Only the payment verification service can perform that transition.

## Important limitation

The current provider is a deterministic `MockPaymentProvider`.

It exists for architecture and testing only. It is **not a real payment gateway** and must not be treated as proof of actual money movement.

Before production:

1. implement a real provider;
2. verify the provider's callback/signature;
3. validate amount and merchant/order identifiers;
4. make callback handling idempotent;
5. store provider reference;
6. implement refund handling;
7. add webhook authentication/signature validation;
8. add monitoring and audit logs.

## API endpoints

### Create payment

```
POST /api/payments/orders/{order_id}
Authorization: Bearer <customer-token>
```

### Provider callback

```
POST /api/payments/webhook
{
  "authority": "..."
}
```

The webhook endpoint is intentionally provider-oriented. A real provider integration should authenticate the callback and use the provider's verification API before marking the payment as successful.

## Tests

Added coverage for:

- creating a payment;
- verifying payment;
- changing order status to PAID only after verification;
- repeated webhook calls;
- preventing one customer from paying another customer's order.

The next payment phase should focus on a real Iranian provider adapter and a proper refund/idempotency model.
