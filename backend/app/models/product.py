from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text, func

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(120), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(String(500), nullable=False, default="")
    roast_level = Column(String(80), nullable=False)
    origin = Column(String(120), nullable=False)
    size = Column(String(80), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

