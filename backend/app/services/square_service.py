import os
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

import requests

from app.services.order_service import PricedOrderItem

SQUARE_API_VERSION = "2026-01-22"
SQUARE_SANDBOX_BASE_URL = "https://connect.squareupsandbox.com"
USD = "USD"


class SquareConfigurationError(Exception):
    pass


class SquareApiError(Exception):
    pass


@dataclass(frozen=True)
class SquarePaymentLinkResult:
    payment_link_id: str
    square_order_id: str
    checkout_url: str
    location_id: str


def create_payment_link(
    *,
    order_number: str,
    customer_email: str,
    items: list[PricedOrderItem],
    shipping_fee: Decimal,
    tax: Decimal,
) -> SquarePaymentLinkResult:
    access_token = get_required_env("SQUARE_ACCESS_TOKEN")
    location_id = get_required_env("SQUARE_LOCATION_ID")
    return_url = get_required_env("MOBILE_APP_RETURN_URL")
    environment = os.getenv("SQUARE_ENVIRONMENT", "sandbox").lower()
    if environment != "sandbox":
        raise SquareConfigurationError(
            "Only Square sandbox mode is supported for this checkout flow."
        )

    payload = {
        "idempotency_key": str(uuid4()),
        "description": f"Flamingo Bean order {order_number}",
        "order": {
            "location_id": location_id,
            "reference_id": order_number,
            "line_items": [
                *[to_square_line_item(item) for item in items],
                *to_square_fixed_line_item("Estimated tax", tax),
                *to_square_fixed_line_item("Flat shipping", shipping_fee),
            ],
        },
        "checkout_options": {"redirect_url": return_url},
        "payment_note": f"Flamingo Bean order {order_number}",
        "pre_populated_data": {"buyer_email": customer_email},
    }

    response = requests.post(
        f"{SQUARE_SANDBOX_BASE_URL}/v2/online-checkout/payment-links",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Square-Version": SQUARE_API_VERSION,
        },
        json=payload,
        timeout=20,
    )
    if response.status_code >= 400:
        raise SquareApiError(extract_square_error(response))

    data = response.json()
    payment_link = data.get("payment_link") or {}
    checkout_url = payment_link.get("url") or payment_link.get("long_url")
    payment_link_id = payment_link.get("id")
    square_order_id = payment_link.get("order_id")
    if not checkout_url or not payment_link_id or not square_order_id:
        raise SquareApiError("Square did not return complete checkout identifiers.")

    return SquarePaymentLinkResult(
        checkout_url=checkout_url,
        payment_link_id=payment_link_id,
        square_order_id=square_order_id,
        location_id=location_id,
    )


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SquareConfigurationError(
            f"{name} is required for Square sandbox checkout."
        )
    return value


def to_square_line_item(item: PricedOrderItem) -> dict:
    return {
        "name": item.name,
        "quantity": str(item.quantity),
        "variation_name": item.size,
        "base_price_money": {"amount": to_cents(item.unit_price), "currency": USD},
    }


def to_square_fixed_line_item(name: str, amount: Decimal) -> list[dict]:
    if amount <= 0:
        return []
    return [
        {
            "name": name,
            "quantity": "1",
            "base_price_money": {"amount": to_cents(amount), "currency": USD},
        }
    ]


def to_cents(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def extract_square_error(response: requests.Response) -> str:
    try:
        data = response.json()
    except ValueError:
        return f"Square returned status {response.status_code}."
    errors = data.get("errors")
    if not errors:
        return f"Square returned status {response.status_code}."
    return "; ".join(
        (error.get("detail") or error.get("code") or "Unknown Square error")
        for error in errors
    )
