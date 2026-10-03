# Nejat-e-Ghaza — Development Plan

## Architecture
Client -> FastAPI Routes -> Services -> Repositories -> SQLAlchemy ORM -> PostgreSQL

Layers:
- api: HTTP routes
- services: business logic
- repositories: persistence access
- db/models: SQLAlchemy ORM models
- schemas: Pydantic request/response models
- core: configuration, security, dependencies
- models: domain enums

## Database Schema

### users
id, name, email (unique), password_hash, role, created_at

### merchants
id, user_id (FK -> users), business_name, description, address, city, created_at

### food_offers
id, merchant_id (FK -> merchants), title, description, original_price, sale_price, quantity, available_quantity, pickup_start, pickup_end, image_url (nullable), is_active, created_at

### orders
id, customer_id (FK -> users), merchant_id (FK -> merchants), total_amount, status, pickup_code, created_at

### order_items
id, order_id (FK -> orders), food_offer_id (FK -> food_offers), quantity, unit_price, subtotal

## Roles
CUSTOMER / MERCHANT / ADMIN

## Order Statuses
PENDING / PAID / READY_FOR_PICKUP / COMPLETED / CANCELLED / EXPIRED

## Constraints
- email unique
- prices and quantities positive
- sale_price <= original_price
- available_quantity >= 0
- order_items.unit_price preserves historical purchase price

## Inventory Concurrency
Order creation will use a database transaction and SELECT FOR UPDATE on the selected food offer before checking and decrementing inventory. This prevents overselling under concurrent orders.

## Planned Structure

app/
  core/
  db/models/
  models/
  schemas/
  repositories/
  services/
  api/routes/

tests/
frontend/
alembic/

## Planned Branches
main
feature/auth
feature/offers
feature/orders
feature/merchant
feature/tests
feature/docker-deployment
