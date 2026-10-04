# نجات غذا | Nejat-e-Ghaza

A full-stack food-surplus marketplace inspired by the **Too Good To Go** model.

نجات غذا به رستوران‌ها، کافه‌ها و فست‌فودها کمک می‌کند غذای مازاد پایان روز را با قیمت کمتر عرضه کنند و مشتری‌ها بتوانند غذای باکیفیت را با تخفیف خریداری و در زمان مشخص تحویل بگیرند.

## ✨ Features

- 🛍️ Browse and search discounted food offers
- 📍 Location-based discovery and nearby offers
- 🏪 Merchant dashboard for managing offers and orders
- 🛒 Cart and order management
- 💳 Payment architecture with Iranian payment gateway support
- 🔐 Authentication and role-based access
- 👤 Customer, Merchant and Admin roles
- ⏱️ Offer and order expiration handling
- 🛡️ Production-oriented security and reliability
- 📱 Persian RTL, responsive and mobile-first UI
- 🧪 Automated backend, frontend and E2E tests

## 🧑‍💻 How to use

### Customer
1. Register or log in.
2. Browse available offers.
3. Open an offer and add it to the cart.
4. Create an order and complete payment.
5. Track the order and pick it up from the merchant.

### Merchant
1. Log in with a merchant account.
2. Create and manage food offers.
3. Monitor available inventory and orders.
4. Manage the order lifecycle until pickup.

### Admin
Manage users, merchants and platform-level operations.

## 🚀 Quick Start

### Requirements

- Python 3.12+
- Node.js 20+
- PostgreSQL
- Redis
- Git

### Backend

```bash
git clone https://github.com/sinanaghdi/nejat-e-ghaza.git
cd nejat-e-ghaza

python -m venv .venv
# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

Create your environment file:

```bash
copy .env.example .env
```

Run database migrations:

```bash
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload
```

API documentation:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally be available at:

```
http://localhost:5173
```

## 🐳 Docker

For a containerized environment:

```bash
docker compose up --build
```

Stop services:

```bash
docker compose down
```

Configure the required values in `.env` before running the application.

## 🧪 Testing

Backend:

```bash
pytest
```

Frontend:

```bash
cd frontend
npm run build
```

E2E:

```bash
npx playwright test
```

## 🏗️ Tech Stack

**Backend:** Python · FastAPI · SQLAlchemy · PostgreSQL · Alembic · Redis · Celery

**Frontend:** React · TypeScript · Vite · Responsive RTL UI

**Infrastructure:** Docker · Docker Compose · Nginx · GitHub Actions

**Testing:** Pytest · Playwright

## 📁 Project Structure

```text
app/            # FastAPI backend
frontend/       # React frontend
alembic/        # Database migrations
tests/          # Backend tests
scripts/        # Utility scripts
Dockerfile*     # Container images
docker-compose.yml
```

## 🔐 Production

Before public deployment, configure production secrets, PostgreSQL/Redis, HTTPS/TLS, payment credentials and the production environment settings.

See [SECURITY.md](SECURITY.md) for security-related deployment guidance.

## 🗺️ Roadmap

- Production launch
- Improved merchant tooling
- Better discovery and personalization
- Operational analytics
- Mobile application

## 📄 License

This project is currently maintained as a portfolio/startup project by **Sina Naghi**.

---

**Nejat-e-Ghaza** — Reduce food waste. Save money. Create value.
