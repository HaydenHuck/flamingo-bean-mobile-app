import os
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DATABASE = Path(__file__).resolve().parent / "security-tests.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DATABASE.as_posix()}"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://testserver"
os.environ["JWT_SECRET_KEY"] = "test-only-secret-key-with-32-characters"
os.environ["ADMIN_COOKIE_SECURE"] = "false"
os.environ["ADMIN_COOKIE_SAMESITE"] = "strict"
os.environ["SQUARE_LOCATION_ID"] = "test-location"
os.environ["SQUARE_WEBHOOK_SIGNATURE_KEY"] = "test-signature-key"
os.environ["SQUARE_WEBHOOK_NOTIFICATION_URL"] = "https://example.test/webhooks/square"

from app.core.rate_limit import limiter  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import AdminUser, Order, OrderItem, Product, WebhookEvent  # noqa: E402, F401


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    limiter.clear()
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def active_product(db) -> Product:
    product = Product(
        name="Server Priced Coffee",
        description="A product controlled by the server.",
        category="Coffee",
        price="16.00",
        image_url="",
        roast_level="Medium",
        origin="Test",
        size="12 oz",
        active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
