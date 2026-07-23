from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True)
    provider = Column(String(40), nullable=False)
    provider_event_id = Column(String(160), nullable=False, unique=True)
    event_type = Column(String(120), nullable=False)
    processing_status = Column(String(40), nullable=False, default="processing")
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    error_description = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    processed_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="webhook_events")
