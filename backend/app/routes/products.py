from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductResponse

router = APIRouter(tags=["products"])


@router.get("/products", response_model=list[ProductResponse])
def get_products(db: Session = Depends(get_db)) -> list[ProductResponse]:
    products = db.query(Product).filter(Product.active.is_(True)).order_by(Product.id).all()

    return [to_product_response(product) for product in products]


def to_product_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        category=product.category,
        price=float(product.price),
        image_url=product.image_url,
        roast_level=product.roast_level,
        origin=product.origin,
        size=product.size,
        active=product.active,
    )
