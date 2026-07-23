from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(40), nullable=False, unique=True, index=True)
    status = Column(String(40), nullable=False, default="received")
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_firebase_uid = Column(String(128), nullable=True, index=True)
    customer_account_email = Column(String(255), nullable=True, index=True)
    guest_email = Column(String(255), nullable=True, index=True)
    guest_access_token_hash = Column(String(64), nullable=True, unique=True, index=True)
    fulfillment_type = Column(String(80), nullable=False)
    pickup_time = Column(String(120), nullable=True)
    shipping_name = Column(String(255), nullable=True)
    shipping_address_line1 = Column(String(255), nullable=True)
    shipping_address_line2 = Column(String(255), nullable=True)
    shipping_city = Column(String(120), nullable=True)
    shipping_state = Column(String(80), nullable=True)
    shipping_zip = Column(String(40), nullable=True)
    shipping_country = Column(String(80), nullable=True)
    payment_status = Column(String(40), nullable=False, default="pending_payment")
    currency = Column(String(3), nullable=False, default="USD")
    square_payment_link_id = Column(String(120), nullable=True)
    square_payment_id = Column(String(120), nullable=True)
    square_order_id = Column(String(120), nullable=True)
    square_location_id = Column(String(120), nullable=True)
    square_checkout_url = Column(String(500), nullable=True)
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax = Column(Numeric(10, 2), nullable=False)
    shipping_fee = Column(Numeric(10, 2), nullable=False, default=0)
    total = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    items = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    webhook_events = relationship("WebhookEvent", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    product_name_snapshot = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(10, 2), nullable=False)
    size = Column(String(80), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
