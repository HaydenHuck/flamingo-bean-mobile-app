from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.firebase_auth import FirebaseUser, get_optional_current_customer
from app.core.rate_limit import rate_limit
from app.database import get_db
from app.models.order import Order
from app.schemas.checkout import CheckoutCreate, CheckoutCreateResponse
from app.services.order_service import create_pending_order
from app.services.square_service import (
    SquareApiError,
    SquareConfigurationError,
    create_payment_link,
)

router = APIRouter(tags=["checkout"])


@router.post("/checkout/create", response_model=CheckoutCreateResponse, status_code=201)
def create_checkout(
    checkout: CheckoutCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_customer: FirebaseUser | None = Depends(get_optional_current_customer),
) -> CheckoutCreateResponse:
    rate_limit(
        request,
        "checkout_creation",
        identifier=current_customer.uid if current_customer else None,
    )
    pending_order = create_pending_order(checkout, db, current_customer)
    db_order = pending_order.order

    try:
        square_payment_link = create_payment_link(
            customer_email=str(checkout.customer_email),
            items=pending_order.priced_items,
            order_number=str(db_order.order_number),
            shipping_fee=db_order.shipping_fee,
            tax=db_order.tax,
        )
    except SquareConfigurationError as exc:
        mark_payment_failed(db_order, db)
        raise HTTPException(
            status_code=503, detail="Checkout is temporarily unavailable."
        ) from exc
    except SquareApiError as exc:
        mark_payment_failed(db_order, db)
        raise HTTPException(
            status_code=502, detail="Payment provider could not create checkout."
        ) from exc

    db_order.square_payment_link_id = square_payment_link.payment_link_id
    db_order.square_order_id = square_payment_link.square_order_id
    db_order.square_location_id = square_payment_link.location_id
    db_order.square_checkout_url = square_payment_link.checkout_url
    db.commit()
    db.refresh(db_order)

    return CheckoutCreateResponse(
        checkout_url=str(db_order.square_checkout_url),
        local_order_number=str(db_order.order_number),
        status=str(db_order.status),
        guest_access_token=pending_order.guest_access_token,
    )


def mark_payment_failed(order: Order, db: Session) -> None:
    if order.payment_status == "pending_payment":
        order.status = "payment_failed"
        order.payment_status = "payment_failed"
    db.commit()
