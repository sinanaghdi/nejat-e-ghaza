# Phase 19 — Production Infrastructure

## Production topology

```
Internet
   |
   v
Nginx :80 / :443
   |
   v
FastAPI
   |
   +--> PostgreSQL
   +--> Redis
   +--> Celery Worker
   +--> Celery Beat
```

Only Nginx is intended to be publicly exposed.

PostgreSQL, Redis, and the FastAPI container use the internal Docker network in the production Compose file.

## Security improvements

- Production image runs as non-root `appuser`.
- PostgreSQL and Redis have no host port mappings in production Compose.
- FastAPI is not directly published to the host.
- Nginx adds baseline security headers:
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
  - Permissions-Policy
- Nginx disables server version tokens.
- Request body size is limited to 5 MB.
- FastAPI is configured for proxy headers.
- Database and Redis credentials are provided through environment variables.
- Production secrets must not be committed to Git.

## Health and startup

The API container waits for PostgreSQL and Redis health checks.

The API runs:

`alembic upgrade head`

before starting Uvicorn.

The API container itself exposes a Docker health check against:

`/health/ready`

Nginx depends on a healthy API.

## HTTPS

The repository contains an HTTP reverse-proxy baseline only.

For production HTTPS:

1. Configure the real domain.
2. Terminate TLS at Nginx or the cloud load balancer.
3. Install certificates through the deployment environment.
4. Redirect HTTP to HTTPS.
5. Set `FRONTEND_ORIGINS` to the exact HTTPS frontend origin.
6. Never commit private keys or certificates.

## Secrets

Replace every placeholder in `.env`:

- `JWT_SECRET_KEY`
- `PAYMENT_WEBHOOK_SECRET`
- `POSTGRES_PASSWORD`
- `BOOTSTRAP_ADMIN_PASSWORD`

Use a deployment secret manager where available.

## Important limitation

The included Compose setup is a production-oriented baseline, not a complete high-availability deployment. A serious public deployment still needs backups, monitoring, centralized logs, TLS automation, resource limits, database migration strategy, and disaster recovery procedures.
