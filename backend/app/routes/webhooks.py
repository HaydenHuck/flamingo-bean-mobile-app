import base64
import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order
from app.models.webhook_event import WebhookEvent
from app.services.square_service import USD, to_cents

router = APIRouter(tags=["webhooks"])
logger = logging.getLogger(__name__)

SIGNATURE_HEADER = "x-square-hmacsha256-signature"
PROTECTED_ORDER_STATUSES = {"preparing", "ready", "completed"}
PAYMENT_COMPLETED_STATUS = "COMPLETED"
PAYMENT_FAILED_STATUSES = {"FAILED", "CANCELED"}
SUPPORTED_PAYMENT_EVENTS = {"payment.created", "payment.updated"}


@router.post("/webhooks/square")
async def square_webhook(
    request: Request, db: Session = Depends(get_db)
) -> dict[str, str]:
    raw_body = await request.body()
    signature_header = request.headers.get(SIGNATURE_HEADER)
    if not signature_header:
        raise HTTPException(status_code=401, detail="Missing Square signature.")
    if not is_valid_square_signature(signature_header, raw_body):
        raise HTTPException(status_code=403, detail="Invalid Square signature.")

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook payload.") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid webhook payload.")

    event_id = payload.get("event_id")
    event_type = payload.get("type")
    if not isinstance(event_id, str) or not event_id or len(event_id) > 160:
        raise HTTPException(
            status_code=400, detail="Webhook event ID is missing or invalid."
        )
    if not isinstance(event_type, str) or not event_type or len(event_type) > 120:
        raise HTTPException(
            status_code=400, detail="Webhook event type is missing or invalid."
        )

    audit_event = WebhookEvent(
        provider="square",
        provider_event_id=event_id,
        event_type=event_type,
        processing_status="processing",
    )
    db.add(audit_event)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        logger.info("Ignoring replayed Square event id=%s", event_id)
        return {"status": "duplicate"}

    try:
        if event_type in SUPPORTED_PAYMENT_EVENTS:
            process_payment_event(payload, audit_event, db)
        else:
            audit_event.processing_status = "ignored"
            audit_event.error_description = (
                "Event type is not used for payment transitions."
            )
        audit_event.processed_at = utc_now()
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Unexpected Square webhook processing error event_id=%s", event_id
        )
        raise HTTPException(
            status_code=500, detail="Webhook processing failed."
        ) from None

    return {"status": audit_event.processing_status}


def is_valid_square_signature(signature_header: str, raw_body: bytes) -> bool:
    signature_key = os.getenv("SQUARE_WEBHOOK_SIGNATURE_KEY")
    notification_url = os.getenv("SQUARE_WEBHOOK_NOTIFICATION_URL")
    if not signature_key or not notification_url:
        logger.error("Square webhook signature configuration is missing")
        return False

    message = notification_url.encode("utf-8") + raw_body
    digest = hmac.new(signature_key.encode("utf-8"), message, hashlib.sha256).digest()
    expected_signature = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected_signature, signature_header)


def process_payment_event(
    payload: dict[str, Any], audit_event: WebhookEvent, db: Session
) -> None:
    payment = extract_event_object(payload, "payment")
    if payment is None:
        reject_event(audit_event, "Payment object is missing.")
        return

    payment_id = payment.get("id")
    square_order_id = payment.get("order_id")
    if not isinstance(payment_id, str) or not payment_id or len(payment_id) > 120:
        reject_event(audit_event, "Payment identifier is missing or invalid.")
        return
    if (
        not isinstance(square_order_id, str)
        or not square_order_id
        or len(square_order_id) > 120
    ):
        reject_event(audit_event, "Square order identifier is missing or invalid.")
        return

    order = (
        db.query(Order)
        .filter(Order.square_order_id == square_order_id)
        .with_for_update()
        .first()
    )
    if order is None:
        reject_event(audit_event, "No local order matches the Square order identifier.")
        return
    audit_event.order_id = order.id

    mismatch = get_payment_mismatch(order, payment)
    if mismatch:
        reject_event(audit_event, mismatch)
        logger.warning(
            "Rejected Square payment reconciliation event_id=%s order_number=%s reason=%s",
            audit_event.provider_event_id,
            order.order_number,
            mismatch,
        )
        return

    payment_status = payment.get("status")
    if payment_status == PAYMENT_COMPLETED_STATUS:
        if order.payment_status in {"pending_payment", "payment_failed"}:
            order.payment_status = "paid"
            if order.status not in PROTECTED_ORDER_STATUSES:
                order.status = "received"
        elif order.payment_status != "paid":
            reject_event(
                audit_event, "Payment cannot transition from the current local state."
            )
            return
        order.square_payment_id = payment_id
    elif payment_status in PAYMENT_FAILED_STATUSES:
        if order.payment_status == "pending_payment":
            order.payment_status = (
                "canceled" if payment_status == "CANCELED" else "payment_failed"
            )
            if order.status not in PROTECTED_ORDER_STATUSES:
                order.status = order.payment_status
    else:
        audit_event.processing_status = "ignored"
        audit_event.error_description = "Payment is not in a terminal state."
        return

    audit_event.processing_status = "processed"
    audit_event.error_description = None


def get_payment_mismatch(order: Order, payment: dict[str, Any]) -> str | None:
    if payment.get("order_id") != order.square_order_id:
        return "Square order identifier does not match."
    if not order.square_payment_link_id:
        return "Local checkout identifier is missing."
    if payment.get("location_id") != order.square_location_id:
        return "Square location does not match."
    if order.square_payment_id and payment.get("id") != order.square_payment_id:
        return "Square payment identifier does not match."

    amount_money = payment.get("amount_money")
    if not isinstance(amount_money, dict):
        return "Payment amount is missing."
    amount = amount_money.get("amount")
    if not isinstance(amount, int) or isinstance(amount, bool):
        return "Payment amount is invalid."
    if amount != to_cents(Decimal(str(order.total))):
        return "Payment amount does not match."
    if amount_money.get("currency") != order.currency or order.currency != USD:
        return "Payment currency does not match."
    return None


def extract_event_object(
    payload: dict[str, Any], object_name: str
) -> dict[str, Any] | None:
    event_data = payload.get("data")
    if not isinstance(event_data, dict):
        return None
    event_object = event_data.get("object")
    if not isinstance(event_object, dict):
        return None
    value = event_object.get(object_name)
    return value if isinstance(value, dict) else None


def reject_event(audit_event: WebhookEvent, description: str) -> None:
    audit_event.processing_status = "rejected"
    audit_event.error_description = description[:255]


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
