# Phase 17 — Production Security & Reliability

## Implemented

### Authentication rate limiting
- Login and registration requests are rate limited.
- Redis stores the counters.
- The limit is configurable through RATE_LIMIT_REQUESTS and RATE_LIMIT_WINDOW_SECONDS.
- In production, an unavailable Redis rate-limit service returns 503 instead of silently disabling protection.
- Non-production environments remain usable when Redis is unavailable.

### Payment webhook authentication
- Webhook requests must include X-Webhook-Secret.
- Requests with a missing or incorrect credential return 401.
- The secret is configuration-driven and must be changed outside development.

### Payment verification locking
Payment verification now locks both the payment and its related order before changing the order to PAID. This prevents competing lifecycle operations from racing with payment verification.

### Transaction-safe order cancellation
Manual cancellation locks the order and each affected offer before restoring inventory. This shares the same locking boundary used by automatic expiration.

## Configuration

Production values must be supplied through the deployment environment:

RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60
PAYMENT_WEBHOOK_SECRET=<strong-random-secret>

The development examples intentionally use placeholders.

## Remaining production work

- Replace shared webhook secret with provider-native signature verification when the real Iranian gateway adapter is added.
- Add audit-log persistence for security-sensitive actions.
- Add secure first-admin bootstrap.
- Add HTTPS/reverse proxy configuration.
- Add security headers and trusted-host configuration.
- Add monitoring and structured logging.
- Review token storage strategy before production deployment.
