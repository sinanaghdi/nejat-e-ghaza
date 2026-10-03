# Phase 10 — Docker & Deployment Foundation

## Local production-like stack

The project now runs as two containers:

- api: FastAPI application
- db: PostgreSQL 16

The API waits for PostgreSQL health before starting and runs:
1. alembic upgrade head
2. uvicorn app.main:app

## Environment

Create a local .env from .env.example.
Never commit real secrets. .env is ignored by Git.
For production, replace the example JWT secret and database credentials with strong secret values supplied by the deployment environment.

## Commands

Build and start:
    docker compose up --build

Stop:
    docker compose down

Stop and remove database volume:
    docker compose down -v

The API is available on port 8000.

## Migration strategy

Database schema changes must be represented by Alembic migrations. The API container applies pending migrations before starting.

## Production note

The current Compose configuration is a development/deployment foundation, not a complete hardened production deployment. Production should additionally use managed secrets, restricted database exposure, TLS/reverse proxy, backups, monitoring, and resource limits.
