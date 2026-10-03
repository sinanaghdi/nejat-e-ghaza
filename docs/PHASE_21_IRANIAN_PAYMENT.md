# Phase 21 — Iranian Payment Gateway

## Payment flow

Customer
  |
  | POST /api/orders
  v
PENDING Order
  |
  | POST /api/payments/orders/{order_id}
  v
Payment(PENDING)
  |
  | ZarinPal request
  v
Authority + checkout URL
  |
  | Browser redirect
  v
ZarinPal
  |
  | GET callback with Authority, Status and order_id
  v
Server-side verify
  |
  +--> amount must match the stored order amount
  +--> authority must belong to the expected order
  +--> provider response 100/101 is accepted
  |
  v
Payment(PAID) + Order(PAID)
  |
  v
Frontend payment result

## Provider boundary

The application keeps the gateway behind PaymentProvider.

Supported providers:

- mock — development/testing only
- zarinpal — Iranian production/sandbox integration

The application stores monetary values in Toman for its user-facing domain. ZarinPal API requests are converted to Rial by multiplying the stored amount by 10.

## Environment

    PAYMENT_PROVIDER=zarinpal
    PAYMENT_CALLBACK_URL=https://YOUR-DOMAIN/api/payments/zarinpal/callback
    FRONTEND_PAYMENT_RESULT_URL=https://YOUR-DOMAIN/payment/result
    PAYMENT_HTTP_TIMEOUT_SECONDS=10

    ZARINPAL_MERCHANT_ID=YOUR_MERCHANT_ID
    ZARINPAL_SANDBOX=false

Never expose ZARINPAL_MERCHANT_ID to the frontend.

## Security rules

1. The client never supplies the payment amount.
2. The amount comes from the persisted Order.
3. The payment is tied to exactly one Order through the unique order_id.
4. The callback authority is looked up server-side.
5. When callback includes order_id, it must match the Payment's Order.
6. Verification uses the stored amount.
7. Gateway success is not trusted until server-side verification succeeds.
8. Verification is idempotent for an already-paid payment.
9. Provider failures return a controlled 502 instead of exposing provider internals.
10. HTTPS is required for the real production callback URL.

## Current limitation

The implementation currently targets ZarinPal. A different Iranian gateway can be added by implementing the existing PaymentProvider interface without changing Order business logic.

Before production launch, configure the real merchant credentials, test the provider sandbox, verify callback behavior, test duplicate callbacks, test failed/cancelled payments, and confirm the gateway's current production documentation and contract.
