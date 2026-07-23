from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.database import get_db
from app.models.order import Order
from app.schemas.order import CustomerOrderSummary, OrderConfirmation, OrderItemResponse
from app.services.order_service import verify_guest_access_token

router = APIRouter(tags=["orders"])


@router.get("/orders/{order_number}", response_model=OrderConfirmation)
def get_guest_order(
    order_number: str,
    request: Request,
    guest_access_token: str | None = Header(default=None, alias="X-Guest-Access-Token"),
    db: Session = Depends(get_db),
) -> OrderConfirmation:
    rate_limit(request, "guest_order_lookup", identifier=order_number)
    if not guest_access_token:
        raise HTTPException(
            status_code=401, detail="Guest order access token is required."
        )

    order = get_order_by_number(db, order_number)
    if order.customer_firebase_uid is not None or not verify_guest_access_token(
        order, guest_access_token
    ):
        raise HTTPException(status_code=404, detail="Order not found.")
    return to_order_confirmation(order)


def get_order_by_number(db: Session, order_number: str) -> Order:
    if not order_number.startswith("FB-") or len(order_number) > 40:
        raise HTTPException(status_code=404, detail="Order not found.")
    order = db.query(Order).filter(Order.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


def to_order_confirmation(order: Order) -> OrderConfirmation:
    return OrderConfirmation(
        order_id=order.order_number,
        order_number=order.order_number,
        status=order.status,
        payment_status=order.payment_status,
        customer_name=order.customer_name,
        fulfillment_type=order.fulfillment_type,
        pickup_time=order.pickup_time,
        shipping_name=order.shipping_name,
        shipping_address_line1=order.shipping_address_line1,
        shipping_address_line2=order.shipping_address_line2,
        shipping_city=order.shipping_city,
        shipping_state=order.shipping_state,
        shipping_zip=order.shipping_zip,
        shipping_country=order.shipping_country,
        items=[
            OrderItemResponse(
                product_id=item.product_id,
                name=item.product_name_snapshot,
                price=float(item.unit_price),
                quantity=item.quantity,
                size=item.size,
                line_total=float(item.line_total),
            )
            for item in order.items
        ],
        subtotal=float(order.subtotal),
        tax=float(order.tax),
        shipping_fee=float(order.shipping_fee),
        total=float(order.total),
        currency=order.currency,
        created_at=order.created_at.isoformat(),
        updated_at=order.updated_at.isoformat(),
    )


def to_customer_order_summary(order: Order) -> CustomerOrderSummary:
    return CustomerOrderSummary(
        order_id=order.order_number,
        order_number=order.order_number,
        status=order.status,
        payment_status=order.payment_status,
        fulfillment_type=order.fulfillment_type,
        pickup_time=order.pickup_time,
        shipping_fee=float(order.shipping_fee),
        total=float(order.total),
        currency=order.currency,
        created_at=order.created_at.isoformat(),
        updated_at=order.updated_at.isoformat(),
    )
