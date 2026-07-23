from app.schemas.order import OrderCreate
from pydantic import BaseModel


class CheckoutCreate(OrderCreate):
    pass


class CheckoutCreateResponse(BaseModel):
    local_order_number: str
    checkout_url: str
    status: str
    guest_access_token: str | None = None
