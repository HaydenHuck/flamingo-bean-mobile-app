from decimal import Decimal

import pytest

from app.models.order import Order
from app.models.product import Product
from app.routes import checkout as checkout_route
from app.services.square_service import SquarePaymentLinkResult


def checkout_payload(product_id: int, **overrides):
    payload = {
        "customer_name": "Guest Customer",
        "customer_email": "guest@example.com",
        "fulfillment_type": "pickup",
        "items": [{"product_id": product_id, "quantity": 1, "size": "12 oz"}],
    }
    payload.update(overrides)
    return payload


@pytest.fixture(autouse=True)
def mock_square(monkeypatch):
    def fake_create_payment_link(**kwargs):
        assert all(item.unit_price == Decimal("16.00") for item in kwargs["items"])
        return SquarePaymentLinkResult(
            payment_link_id="link-123",
            square_order_id="square-order-123",
            checkout_url="https://square.test/checkout",
            location_id="test-location",
        )

    monkeypatch.setattr(checkout_route, "create_payment_link", fake_create_payment_link)


def test_client_cannot_reduce_product_price(client, active_product, db):
    payload = checkout_payload(active_product.id)
    payload["items"][0]["price"] = 0.01
    payload["items"][0]["name"] = "Tampered"
    response = client.post("/checkout/create", json=payload)
    assert response.status_code == 422
    assert db.query(Order).count() == 0

    response = client.post("/checkout/create", json=checkout_payload(active_product.id))
    assert response.status_code == 201
    db.expire_all()
    order = db.query(Order).one()
    assert order.subtotal == Decimal("16.00")
    assert order.total == Decimal("17.32")
    assert order.items[0].product_name_snapshot == "Server Priced Coffee"
    assert order.items[0].unit_price == Decimal("16.00")


@pytest.mark.parametrize("product_state", ["inactive", "missing"])
def test_inactive_or_nonexistent_products_are_rejected(
    client, active_product, db, product_state
):
    product_id = active_product.id
    if product_state == "inactive":
        active_product.active = False
        db.commit()
    else:
        product_id = 999999

    response = client.post("/checkout/create", json=checkout_payload(product_id))
    assert response.status_code in {404, 409}
    assert db.query(Order).count() == 0


def test_excessive_quantities_and_item_counts_are_rejected(client, active_product, db):
    too_many = checkout_payload(active_product.id)
    too_many["items"][0]["quantity"] = 11
    assert client.post("/checkout/create", json=too_many).status_code == 422

    products = [active_product]
    for index in range(20):
        product = Product(
            name=f"Product {index}",
            description="Test",
            category="Coffee",
            price="1.00",
            image_url="",
            roast_level="",
            origin="",
            size=f"{index + 1} oz",
            active=True,
        )
        db.add(product)
        products.append(product)
    db.commit()
    payload = checkout_payload(active_product.id)
    payload["items"] = [
        {"product_id": product.id, "quantity": 1, "size": product.size}
        for product in products
    ]
    assert client.post("/checkout/create", json=payload).status_code == 422

    payload["items"] = [
        {"product_id": product.id, "quantity": 3, "size": product.size}
        for product in products[:20]
    ]
    assert client.post("/checkout/create", json=payload).status_code == 422


def test_unpaid_order_cannot_be_created_as_paid(client, active_product, db):
    assert client.post(
        "/orders", json=checkout_payload(active_product.id)
    ).status_code in {404, 405}
    response = client.post("/checkout/create", json=checkout_payload(active_product.id))
    assert response.status_code == 201
    db.expire_all()
    order = db.query(Order).one()
    assert order.payment_status == "pending_payment"
    assert order.status == "pending_payment"


def test_guest_token_is_required_and_numeric_ids_are_not_authorization(
    client, active_product, db
):
    response = client.post("/checkout/create", json=checkout_payload(active_product.id))
    assert response.status_code == 201
    result = response.json()
    token = result["guest_access_token"]
    order_number = result["local_order_number"]
    assert token and len(token) >= 32

    db.expire_all()
    order = db.query(Order).one()
    assert order.guest_access_token_hash != token
    assert (
        client.get(
            f"/orders/{order.id}", headers={"X-Guest-Access-Token": token}
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/orders/{order_number}", headers={"X-Guest-Access-Token": "x" * 43}
        ).status_code
        == 404
    )
    assert client.get(f"/orders/{order_number}").status_code == 401
    assert (
        client.get(
            f"/orders/{order_number}", headers={"X-Guest-Access-Token": token}
        ).status_code
        == 200
    )


def test_checkout_and_guest_lookup_rate_limits_activate(
    client, active_product, monkeypatch
):
    monkeypatch.setenv("RATE_LIMIT_CHECKOUT_CREATION", "1/60")
    first = client.post("/checkout/create", json=checkout_payload(active_product.id))
    assert first.status_code == 201
    assert (
        client.post(
            "/checkout/create", json=checkout_payload(active_product.id)
        ).status_code
        == 429
    )

    monkeypatch.setenv("RATE_LIMIT_GUEST_ORDER_LOOKUP", "1/60")
    order_number = first.json()["local_order_number"]
    token = first.json()["guest_access_token"]
    assert (
        client.get(
            f"/orders/{order_number}", headers={"X-Guest-Access-Token": token}
        ).status_code
        == 200
    )
    assert (
        client.get(
            f"/orders/{order_number}", headers={"X-Guest-Access-Token": token}
        ).status_code
        == 429
    )
