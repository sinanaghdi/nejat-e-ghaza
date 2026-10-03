from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.offers import router as offers_router
from app.api.routes.orders import router as orders_router
from app.api.routes.merchant import router as merchant_router
from app.api.routes.admin import router as admin_router

app = FastAPI(title="Nejat-e-Ghaza")

app.include_router(auth_router)
app.include_router(offers_router)
app.include_router(orders_router)
app.include_router(merchant_router)
app.include_router(admin_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
