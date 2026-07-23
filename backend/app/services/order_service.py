from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.firebase_auth import FirebaseUser
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.order import OrderCreate

TAX_RATE = Decimal("0.0825")
MONEY_QUANTIZER = Decimal("0.01")
FLAT_SHIPPING_FEE = Decimal("6.99")
PICKUP_FULFILLMENT = "pickup"
SHIPPING_FULFILLMENT = "shipping"
ORDER_CURRENCY = "USD"


@dataclass(frozen=True)
class PricedOrderItem:
    product_id: int
    name: str
    quantity: int
    size: str
    unit_price: Decimal
    line_total: Decimal


@dataclass(frozen=True)
class PendingOrderResult:
    order: Order
    priced_items: list[PricedOrderItem]
    guest_access_token: str | None


def create_pending_order(
    checkout: OrderCreate,
    db: Session,
    current_customer: FirebaseUser | None = None,
) -> PendingOrderResult:
    priced_items = price_order_items(checkout, db)
    subtotal = money(
        sum((item.line_total for item in priced_items), start=Decimal("0"))
    )
    tax = money(subtotal * TAX_RATE)
    shipping_fee = get_shipping_fee(checkout.fulfillment_type)
    total = money(subtotal + tax + shipping_fee)
    order_number = f"FB-{uuid4().hex[:16].upper()}"
    is_shipping = checkout.fulfillment_type == SHIPPING_FULFILLMENT
    guest_access_token = None if current_customer else secrets.token_urlsafe(32)

    db_order = Order(
        order_number=order_number,
        status="pending_payment",
        payment_status="pending_payment",
        currency=ORDER_CURRENCY,
        customer_name=checkout.customer_name,
        customer_email=str(checkout.customer_email).lower(),
        customer_firebase_uid=current_customer.uid if current_customer else None,
        customer_account_email=current_customer.email if current_customer else None,
        guest_email=None if current_customer else str(checkout.customer_email).lower(),
        guest_access_token_hash=hash_guest_access_token(guest_access_token)
        if guest_access_token
        else None,
        fulfillment_type=checkout.fulfillment_type,
        pickup_time=checkout.pickup_time
        if checkout.fulfillment_type == PICKUP_FULFILLMENT
        else None,
        shipping_name=checkout.shipping_name if is_shipping else None,
        shipping_address_line1=checkout.shipping_address_line1 if is_shipping else None,
        shipping_address_line2=checkout.shipping_address_line2 if is_shipping else None,
        shipping_city=checkout.shipping_city if is_shipping else None,
        shipping_state=checkout.shipping_state if is_shipping else None,
        shipping_zip=checkout.shipping_zip if is_shipping else None,
        shipping_country=checkout.shipping_country if is_shipping else None,
        subtotal=subtotal,
        tax=tax,
        shipping_fee=shipping_fee,
        total=total,
    )
    db.add(db_order)
    db.flush()

    for item in priced_items:
        db.add(
            OrderItem(
                order_id=db_order.id,
                product_id=item.product_id,
                product_name_snapshot=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
                size=item.size,
            )
        )

    db.commit()
    db.refresh(db_order)
    return PendingOrderResult(
        order=db_order,
        priced_items=priced_items,
        guest_access_token=guest_access_token,
    )


def price_order_items(checkout: OrderCreate, db: Session) -> list[PricedOrderItem]:
    product_ids = {item.product_id for item in checkout.items}
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    products_by_id = {int(product.id): product for product in products}
    priced_items: list[PricedOrderItem] = []

    for requested_item in checkout.items:
        product = products_by_id.get(requested_item.product_id)
        if product is None:
            raise HTTPException(
                status_code=404,
                detail=f"Product {requested_item.product_id} was not found.",
            )
        if not product.active:
            raise HTTPException(
                status_code=409,
                detail=f"Product {requested_item.product_id} is unavailable.",
            )
        if requested_item.size.casefold() != str(product.size).strip().casefold():
            raise HTTPException(
                status_code=422,
                detail=f"Selected size is not available for product {requested_item.product_id}.",
            )

        unit_price = money(Decimal(str(product.price)))
        priced_items.append(
            PricedOrderItem(
                product_id=int(product.id),
                name=str(product.name),
                quantity=requested_item.quantity,
                size=str(product.size),
                unit_price=unit_price,
                line_total=money(unit_price * requested_item.quantity),
            )
        )

    return priced_items


def verify_guest_access_token(order: Order, token: str) -> bool:
    stored_hash = order.guest_access_token_hash
    if not stored_hash:
        return False
    return hmac.compare_digest(str(stored_hash), hash_guest_access_token(token))


def hash_guest_access_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_shipping_fee(fulfillment_type: str) -> Decimal:
    return money(
        FLAT_SHIPPING_FEE if fulfillment_type == SHIPPING_FULFILLMENT else Decimal("0")
    )


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
