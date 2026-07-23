from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_admin_user
from app.database import get_db
from app.models.order import Order
from app.models.product import Product
from app.schemas.order import (
    AdminOrderDetail,
    AdminOrderItem,
    AdminOrderSummary,
    OrderStatusUpdate,
)
from app.schemas.product import (
    ProductActiveUpdate,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin_user)]
)


@router.get("/products", response_model=list[ProductResponse])
def get_admin_products(db: Session = Depends(get_db)) -> list[ProductResponse]:
    products = db.query(Product).order_by(Product.category, Product.name).all()

    return [to_product_response(product) for product in products]


@router.post("/products", response_model=ProductResponse, status_code=201)
def create_admin_product(
    product: ProductCreate, db: Session = Depends(get_db)
) -> ProductResponse:
    db_product = Product(
        name=product.name,
        description=product.description,
        category=product.category,
        price=product.price,
        image_url=product.image_url,
        roast_level=product.roast_level,
        origin=product.origin,
        size=product.size,
        active=product.active,
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    return to_product_response(db_product)


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_admin_product(
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_db),
) -> ProductResponse:
    db_product = get_product_by_id(db, product_id)

    db_product.name = product.name
    db_product.description = product.description
    db_product.category = product.category
    db_product.price = product.price
    db_product.image_url = product.image_url
    db_product.roast_level = product.roast_level
    db_product.origin = product.origin
    db_product.size = product.size
    db_product.active = product.active

    db.commit()
    db.refresh(db_product)

    return to_product_response(db_product)


@router.patch("/products/{product_id}/active", response_model=ProductResponse)
def update_admin_product_active(
    product_id: int,
    active_update: ProductActiveUpdate,
    db: Session = Depends(get_db),
) -> ProductResponse:
    db_product = get_product_by_id(db, product_id)
    db_product.active = active_update.active

    db.commit()
    db.refresh(db_product)

    return to_product_response(db_product)


@router.get("/orders", response_model=list[AdminOrderSummary])
def get_admin_orders(db: Session = Depends(get_db)) -> list[AdminOrderSummary]:
    orders = db.query(Order).order_by(Order.created_at.desc(), Order.id.desc()).all()

    return [to_admin_order_summary(order) for order in orders]


@router.get("/orders/{order_id}", response_model=AdminOrderDetail)
def get_admin_order(order_id: str, db: Session = Depends(get_db)) -> AdminOrderDetail:
    order = get_order_by_number(db, order_id)

    return to_admin_order_detail(order)


@router.put("/orders/{order_id}/status", response_model=AdminOrderDetail)
def update_admin_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db),
) -> AdminOrderDetail:
    order = get_order_by_number(db, order_id)

    setattr(order, "status", status_update.status)

    db.commit()
    db.refresh(order)

    return to_admin_order_detail(order)


def get_order_by_number(db: Session, order_number: str) -> Order:
    order = db.query(Order).filter(Order.order_number == order_number).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    return order


def to_admin_order_summary(order: Order):
    return AdminOrderSummary(
        order_id=str(order.order_number),
        customer_name=str(order.customer_name),
        customer_email=str(order.customer_email),
        customer_firebase_uid=order.customer_firebase_uid,
        customer_account_email=order.customer_account_email,
        guest_email=order.guest_email,
        fulfillment_type=str(order.fulfillment_type),
        pickup_time=order.pickup_time,
        shipping_name=order.shipping_name,
        shipping_address_line1=order.shipping_address_line1,
        shipping_address_line2=order.shipping_address_line2,
        shipping_city=order.shipping_city,
        shipping_state=order.shipping_state,
        shipping_zip=order.shipping_zip,
        shipping_country=order.shipping_country,
        status=str(order.status),
        payment_status=str(order.payment_status),
        subtotal=float(str(order.subtotal)),
        tax=float(str(order.tax)),
        shipping_fee=float(str(order.shipping_fee)),
        total=float(str(order.total)),
        currency=str(order.currency),
        created_at=order.created_at.isoformat(),
    )


def to_admin_order_detail(order: Order) -> AdminOrderDetail:
    summary = to_admin_order_summary(order)

    return AdminOrderDetail(
        **summary.model_dump(),
        items=[
            AdminOrderItem(
                product_id=item.product_id,
                name=item.product_name_snapshot,
                price=float(item.unit_price),
                quantity=item.quantity,
                size=item.size,
                line_total=float(item.line_total),
            )
            for item in order.items
        ],
    )


def get_product_by_id(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    return product


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
