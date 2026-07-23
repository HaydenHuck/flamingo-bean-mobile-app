from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

MAX_DISTINCT_ITEMS = 20
MAX_QUANTITY_PER_ITEM = 10
MAX_TOTAL_QUANTITY = 50

ShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
NameText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
AddressText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
OptionalShortText = (
    Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
    ]
    | None
)
OptionalAddressText = (
    Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
    ]
    | None
)


class OrderItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=MAX_QUANTITY_PER_ITEM)
    size: ShortText


class OrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_name: NameText
    customer_email: EmailStr
    fulfillment_type: Literal["pickup", "shipping"]
    pickup_time: OptionalShortText = None
    shipping_name: NameText | None = None
    shipping_address_line1: OptionalAddressText = None
    shipping_address_line2: (
        Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None
    ) = None
    shipping_city: OptionalShortText = None
    shipping_state: (
        Annotated[
            str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
        ]
        | None
    ) = None
    shipping_zip: (
        Annotated[
            str, StringConstraints(strip_whitespace=True, min_length=2, max_length=20)
        ]
        | None
    ) = None
    shipping_country: (
        Annotated[
            str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)
        ]
        | None
    ) = None
    items: list[OrderItemCreate] = Field(min_length=1, max_length=MAX_DISTINCT_ITEMS)

    @field_validator("shipping_address_line2", mode="before")
    @classmethod
    def normalize_optional_empty_text(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def validate_checkout(self) -> "OrderCreate":
        if sum(item.quantity for item in self.items) > MAX_TOTAL_QUANTITY:
            raise ValueError(
                f"Checkout cannot exceed {MAX_TOTAL_QUANTITY} total items."
            )

        item_selections = [
            (item.product_id, item.size.casefold()) for item in self.items
        ]
        if len(item_selections) != len(set(item_selections)):
            raise ValueError(
                "Duplicate product selections must be combined into one item."
            )

        if self.fulfillment_type == "shipping":
            required = (
                self.shipping_name,
                self.shipping_address_line1,
                self.shipping_city,
                self.shipping_state,
                self.shipping_zip,
                self.shipping_country,
            )
            if any(value is None for value in required):
                raise ValueError(
                    "Shipping name and complete address are required for shipping orders."
                )

        return self


class OrderItemResponse(BaseModel):
    product_id: int
    name: str
    price: float
    quantity: int
    size: str
    line_total: float


class OrderConfirmation(BaseModel):
    order_id: str
    order_number: str
    status: str
    payment_status: str
    customer_name: str
    fulfillment_type: str
    pickup_time: str | None = None
    shipping_name: str | None = None
    shipping_address_line1: str | None = None
    shipping_address_line2: str | None = None
    shipping_city: str | None = None
    shipping_state: str | None = None
    shipping_zip: str | None = None
    shipping_country: str | None = None
    items: list[OrderItemResponse]
    subtotal: float
    tax: float
    shipping_fee: float
    total: float
    currency: str
    created_at: str
    updated_at: str


class AdminOrderSummary(BaseModel):
    order_id: str
    customer_name: str
    customer_email: str
    customer_firebase_uid: str | None = None
    customer_account_email: str | None = None
    guest_email: str | None = None
    fulfillment_type: str
    pickup_time: str | None = None
    shipping_name: str | None = None
    shipping_address_line1: str | None = None
    shipping_address_line2: str | None = None
    shipping_city: str | None = None
    shipping_state: str | None = None
    shipping_zip: str | None = None
    shipping_country: str | None = None
    status: str
    payment_status: str
    subtotal: float
    tax: float
    shipping_fee: float
    total: float
    currency: str
    created_at: str


class AdminOrderItem(BaseModel):
    product_id: int
    name: str
    price: float
    quantity: int
    size: str
    line_total: float


class AdminOrderDetail(AdminOrderSummary):
    items: list[AdminOrderItem]


class CustomerOrderSummary(BaseModel):
    order_id: str
    order_number: str
    status: str
    payment_status: str
    fulfillment_type: str
    pickup_time: str | None = None
    shipping_fee: float
    total: float
    currency: str
    created_at: str
    updated_at: str


class LinkGuestOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order_number: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=10, max_length=40)
    ]
    guest_access_token: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=32, max_length=128)
    ]


class LinkGuestOrdersResponse(BaseModel):
    linked_count: int
    message: str


class OrderStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["received", "preparing", "ready", "completed", "canceled"]
