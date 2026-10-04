import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.offers import router as offers_router
from app.api.routes.orders import router as orders_router
from app.api.routes.merchant import router as merchant_router
from app.api.routes.admin import router as admin_router
from app.api.routes.payments import router as payments_router
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.middleware.request_context import RequestContextMiddleware

configure_logging()
logger = logging.getLogger("nejat_e_ghaza")
settings.validate_production()

app = FastAPI(title="Nejat-e-Ghaza")

app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

app.include_router(auth_router)
app.include_router(offers_router)
app.include_router(orders_router)
app.include_router(merchant_router)
app.include_router(admin_router)
app.include_router(payments_router)
app.include_router(health_router)
