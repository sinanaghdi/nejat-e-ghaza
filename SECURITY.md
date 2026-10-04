# Production Security Checklist

## Mandatory before public launch

- Set `ENVIRONMENT=production`.
- Use PostgreSQL and a production Redis service.
- Set a random `JWT_SECRET_KEY` with at least 32 UTF-8 bytes.
- Set a random `PAYMENT_WEBHOOK_SECRET` with at least 32 UTF-8 bytes.
- Use exact HTTPS values for `FRONTEND_ORIGINS`, `PAYMENT_CALLBACK_URL`, and `FRONTEND_PAYMENT_RESULT_URL`.
- Use `PAYMENT_PROVIDER=zarinpal` (or another verified real provider); the mock provider is rejected in production.
- Set `ZARINPAL_SANDBOX=false` for live ZarinPal traffic.
- Never expose PostgreSQL, Redis, or FastAPI ports directly to the public internet.
- Terminate TLS at Nginx or the external load balancer and redirect HTTP to HTTPS.
- Store production secrets in a secret manager when available.
- Configure automated PostgreSQL backups and test restoration regularly.
- Configure centralized application logs, alerts, and infrastructure monitoring.
- Review npm and Python dependency advisories before every release.

## Payment safety

Payment verification is idempotent for already-paid payments. A failed payment can be retried safely; the retry receives a new payment authority while the previous failed authority becomes stale.

Keep the webhook endpoint protected by `X-Webhook-Secret`. For a real payment provider, prefer provider-signed callbacks or verification APIs and keep provider-side verification as the final source of truth.

## Browser authentication

The browser client now uses an HttpOnly session cookie for the access token. JavaScript does not store the JWT in localStorage.

State-changing browser requests use a double-submit CSRF token:

- HttpOnly session cookie for authentication.
- Non-HttpOnly CSRF cookie plus `X-CSRF-Token` request header.
- Bearer-token API clients remain supported for backward compatibility and are not subject to the cookie-specific CSRF check.

In production, the session cookie must be Secure and use HTTPS.

## Recovery

A production deployment should have:

1. Automated daily database backups.
2. A documented restore procedure.
3. A tested rollback procedure for application images and migrations.
4. A defined retention policy.
5. Monitoring for database, Redis, worker, and payment failures.
