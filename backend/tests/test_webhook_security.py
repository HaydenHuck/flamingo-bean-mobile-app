import base64
import hashlib
import hmac
import json
from decimal import Decimal

import pytest

from app.models.order import Order
from app.models.webhook_event import WebhookEvent

NOTIFICATION_URL = "https://example.test/webhooks/square"
SIGNATURE_KEY = "test-signature-key"


def square_order(db) -> Order:
    order = Order(
        order_number="FB-WEBHOOKTEST0001",
        status="pending_payment",
        payment_status="pending_payment",
        currency="USD",
        customer_name="Webhook Customer",
        customer_email="customer@example.com",
        guest_email="customer@example.com",
        guest_access_token_hash="a" * 64,
        fulfillment_type="pickup",
        subtotal=Decimal("16.00"),
        tax=Decimal("1.32"),
        shipping_fee=Decimal("0.00"),
        total=Decimal("17.32"),
        square_payment_link_id="link-123",
        square_order_id="square-order-123",
        square_location_id="test-location",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def payment_event(event_id="event-1", **payment_overrides):
    payment = {
        "id": "payment-123",
        "order_id": "square-order-123",
        "location_id": "test-location",
        "status": "COMPLETED",
        "amount_money": {"amount": 1732, "currency": "USD"},
    }
    payment.update(payment_overrides)
    return {
        "event_id": event_id,
        "type": "payment.updated",
        "data": {"object": {"payment": payment}},
    }


def signed_request(client, payload, signature_override=None):
    body = json.dumps(payload, separators=(",", ":")).encode()
    digest = hmac.new(
        SIGNATURE_KEY.encode(), NOTIFICATION_URL.encode() + body, hashlib.sha256
    ).digest()
    signature = signature_override or base64.b64encode(digest).decode()
    return client.post(
        "/webhooks/square",
        content=body,
        headers={
            "Content-Type": "application/json",
            "x-square-hmacsha256-signature": signature,
        },
    )


def test_valid_square_webhook_marks_correct_order_paid(client, db):
    order = square_order(db)
    response = signed_request(client, payment_event())
    assert response.status_code == 200
    db.refresh(order)
    assert order.payment_status == "paid"
    assert order.status == "received"
    assert order.square_payment_id == "payment-123"


@pytest.mark.parametrize(
    "override",
    [
        {"amount_money": {"amount": 1, "currency": "USD"}},
        {"amount_money": {"amount": 1732, "currency": "CAD"}},
        {"location_id": "other-location"},
        {"order_id": "other-order"},
    ],
)
def test_reconciliation_mismatch_does_not_mark_paid(client, db, override):
    order = square_order(db)
    response = signed_request(client, payment_event(**override))
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    db.refresh(order)
    assert order.payment_status == "pending_payment"


def test_existing_payment_identifier_mismatch_does_not_mark_paid(client, db):
    order = square_order(db)
    order.square_payment_id = "expected-payment-id"
    db.commit()
    response = signed_request(client, payment_event(id="different-payment-id"))
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    db.refresh(order)
    assert order.payment_status == "pending_payment"


def test_replayed_webhook_is_processed_only_once(client, db):
    order = square_order(db)
    payload = payment_event()
    assert signed_request(client, payload).json()["status"] == "processed"
    assert signed_request(client, payload).json()["status"] == "duplicate"
    db.refresh(order)
    assert order.payment_status == "paid"
    assert db.query(WebhookEvent).count() == 1


def test_invalid_webhook_signature_is_rejected(client, db):
    order = square_order(db)
    response = signed_request(client, payment_event(), signature_override="invalid")
    assert response.status_code == 403
    db.refresh(order)
    assert order.payment_status == "pending_payment"
    assert db.query(WebhookEvent).count() == 0
