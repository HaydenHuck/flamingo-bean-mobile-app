from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_cors_allowed_origins
from app.core.request_limits import RequestBodyLimitMiddleware
from app.database import SessionLocal, ensure_database_is_migrated
from app.routes.admin import router as admin_router
from app.routes.admin_auth import router as admin_auth_router
from app.routes.checkout import router as checkout_router
from app.routes.customer import router as customer_router
from app.routes.orders import router as orders_router
from app.routes.products import router as products_router
from app.routes.webhooks import router as webhooks_router
from app.services.seed import seed_products


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_database_is_migrated()

    db = SessionLocal()
    try:
        seed_products(db)
    finally:
        db.close()

    yield


app = FastAPI(title="Flamingo Bean API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-CSRF-Token",
        "X-Guest-Access-Token",
    ],
)
app.add_middleware(RequestBodyLimitMiddleware)

app.include_router(products_router)
app.include_router(orders_router)
app.include_router(admin_auth_router)
app.include_router(admin_router)
app.include_router(checkout_router)
app.include_router(customer_router)
app.include_router(webhooks_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
