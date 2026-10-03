# Phase 18 — Audit Logging & Observability

## Goals

Phase 18 adds operational visibility without logging secrets or authentication credentials.

### Audit log

Persistent table: `audit_logs`

Tracked events include:

- `auth.registered`
- `auth.login`
- `user.role_changed`
- `order.created`
- `order.status_changed`
- `order.expired`
- `payment.created`
- `payment.verified`
- `payment.failed`

Each event can contain:

- actor user ID
- action
- entity type and ID
- request ID
- IP address field
- success flag
- safe structured details
- error message field
- UTC timestamp

Passwords, JWTs, payment authorities, and other credentials must not be written to audit details.

## Request correlation

Every HTTP request receives an `X-Request-ID`.

- The client may provide one.
- Otherwise the API generates a random ID.
- The ID is returned in the response header.
- Application logs include the request ID.
- Audit events created during the request inherit the same request ID.

This allows an incident to be traced from an HTTP request to its domain events.

## Health endpoints

### GET /health

Liveness endpoint. It confirms that the API process is running.

### GET /health/ready

Readiness endpoint. It checks:

- PostgreSQL
- Redis

It returns HTTP 200 only when both dependencies are available. Otherwise it returns HTTP 503.

Dependency error details are intentionally not exposed.

## Logging

The application now uses a structured log format containing:

- timestamp
- level
- request ID
- logger name
- message

The implementation intentionally avoids request-body logging so credentials and payment data are not accidentally written to logs.

## Transaction rule

Business events are written in the same database transaction as the state change where practical. If the transaction rolls back, the corresponding audit event also rolls back.

## Remaining production work

- central log aggregation
- log retention policy
- alerting
- metrics/tracing
- real payment-provider audit events
- failed authentication audit events with careful privacy controls
- immutable/append-only audit storage policy
- production secret management
