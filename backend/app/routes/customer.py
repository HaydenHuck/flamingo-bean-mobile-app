from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.firebase_auth import FirebaseUser, get_current_customer
from app.core.rate_limit import rate_limit
from app.database import get_db
from app.models.order import Order
from app.routes.orders import (
    get_order_by_number,
    to_customer_order_summary,
    to_order_confirmation,
)
from app.schemas.order import (
    CustomerOrderSummary,
    LinkGuestOrderRequest,
    LinkGuestOrdersResponse,
    OrderConfirmation,
)
from app.services.order_service import verify_guest_access_token

router = APIRouter(prefix="/customer", tags=["customer"])


@router.get("/orders", response_model=list[CustomerOrderSummary])
def get_customer_orders(
    current_customer: FirebaseUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
) -> list[CustomerOrderSummary]:
    orders = (
        db.query(Order)
        .filter(Order.customer_firebase_uid == current_customer.uid)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .all()
    )

    return [to_customer_order_summary(order) for order in orders]


@router.get("/orders/{order_id}", response_model=OrderConfirmation)
def get_customer_order(
    order_id: str,
    current_customer: FirebaseUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
) -> OrderConfirmation:
    order = get_order_by_number(db, order_id)

    if order.customer_firebase_uid != current_customer.uid:
        raise HTTPException(status_code=404, detail="Order not found.")

    return to_order_confirmation(order)


@router.post("/link-guest-orders", response_model=LinkGuestOrdersResponse)
def link_guest_orders(
    link_request: LinkGuestOrderRequest,
    request: Request,
    current_customer: FirebaseUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
) -> LinkGuestOrdersResponse:
    rate_limit(request, "guest_order_linking", identifier=current_customer.uid)
    if not current_customer.email or not current_customer.email_verified:
        return LinkGuestOrdersResponse(
            linked_count=0,
            message="Verify your email before linking previous guest orders.",
        )

    normalized_email = current_customer.email.strip().lower()
    order = (
        db.query(Order)
        .filter(Order.order_number == link_request.order_number)
        .filter(Order.customer_firebase_uid.is_(None))
        .first()
    )
    if (
        order is None
        or str(order.guest_email or "").lower() != normalized_email
        or not verify_guest_access_token(order, link_request.guest_access_token)
    ):
        raise HTTPException(status_code=404, detail="Guest order could not be linked.")

    order.customer_firebase_uid = current_customer.uid
    order.customer_account_email = normalized_email
    order.guest_access_token_hash = None
    db.commit()

    return LinkGuestOrdersResponse(
        linked_count=1,
        message="Guest order linked to your account.",
    )
