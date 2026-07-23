from decimal import Decimal

from app.core.firebase_auth import FirebaseUser, get_current_customer
from app.main import app
from app.models.order import Order
from app.services.order_service import hash_guest_access_token


def owned_order(db, uid: str) -> Order:
    order = Order(
        order_number=f"FB-{uid.upper():0<16}"[:19],
        status="pending_payment",
        payment_status="pending_payment",
        currency="USD",
        customer_name="Customer",
        customer_email="customer@example.com",
        customer_firebase_uid=uid,
        customer_account_email="customer@example.com",
        fulfillment_type="pickup",
        subtotal=Decimal("10.00"),
        tax=Decimal("0.83"),
        shipping_fee=Decimal("0.00"),
        total=Decimal("10.83"),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_customer_cannot_access_another_customers_order(client, db):
    order = owned_order(db, "customer-b")
    app.dependency_overrides[get_current_customer] = lambda: FirebaseUser(
        uid="customer-a",
        email="a@example.com",
        email_verified=True,
    )
    response = client.get(f"/customer/orders/{order.order_number}")
    assert response.status_code == 404


def test_admin_routes_require_admin_authentication(client):
    assert client.get("/admin/orders").status_code == 401
    assert client.get("/admin/products").status_code == 401


def test_guest_linking_requires_token_and_is_rate_limited(client, db, monkeypatch):
    raw_token = "secure-guest-token-" + "x" * 32
    order = Order(
        order_number="FB-GUESTLINKTEST01",
        status="pending_payment",
        payment_status="pending_payment",
        currency="USD",
        customer_name="Guest",
        customer_email="verified@example.com",
        guest_email="verified@example.com",
        guest_access_token_hash=hash_guest_access_token(raw_token),
        fulfillment_type="pickup",
        subtotal=Decimal("10.00"),
        tax=Decimal("0.83"),
        shipping_fee=Decimal("0.00"),
        total=Decimal("10.83"),
    )
    db.add(order)
    db.commit()
    app.dependency_overrides[get_current_customer] = lambda: FirebaseUser(
        uid="verified-customer",
        email="verified@example.com",
        email_verified=True,
    )
    monkeypatch.setenv("RATE_LIMIT_GUEST_ORDER_LINKING", "1/60")
    response = client.post(
        "/customer/link-guest-orders",
        json={"order_number": order.order_number, "guest_access_token": raw_token},
    )
    assert response.status_code == 200
    db.refresh(order)
    assert order.customer_firebase_uid == "verified-customer"
    assert order.guest_access_token_hash is None
    assert (
        client.post(
            "/customer/link-guest-orders",
            json={"order_number": order.order_number, "guest_access_token": raw_token},
        ).status_code
        == 429
    )
