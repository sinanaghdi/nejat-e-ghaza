# Phase 2 — Database & Migrations

## Stack
- PostgreSQL
- SQLAlchemy 2.x
- Alembic
- psycopg

## Implemented Models
- User
- Merchant
- FoodOffer
- Order
- OrderItem

## Database Rules
- Unique user email
- Unique merchant user profile
- Unique pickup code
- Decimal/Numeric prices
- Positive price and quantity constraints
- sale_price <= original_price
- available_quantity >= 0
- Order item stores historical unit_price

## Migration
Initial migration:
alembic/versions/0001_initial_schema.py

## Configuration
Database and security configuration are loaded with Pydantic Settings from environment variables.

## Next
Phase 3 — Authentication & Authorization.
