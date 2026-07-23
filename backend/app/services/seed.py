from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.product import Product

SEED_PRODUCTS = [
    {
        "name": "Flamingo House Blend",
        "description": "A smooth everyday blend with notes of caramel, cocoa, and bright citrus.",
        "category": "Coffee Beans",
        "price": Decimal("16.00"),
        "image_url": "https://placehold.co/800x600/png?text=Flamingo+House+Blend",
        "roast_level": "Medium",
        "origin": "Colombia and Brazil",
        "size": "12 oz",
        "active": True,
    },
    {
        "name": "Sunrise Espresso",
        "description": "A rich espresso roast with dark chocolate, toasted almond, and brown sugar notes.",
        "category": "Coffee Beans",
        "price": Decimal("18.00"),
        "image_url": "https://placehold.co/800x600/png?text=Sunrise+Espresso",
        "roast_level": "Medium-Dark",
        "origin": "Brazil and Guatemala",
        "size": "12 oz",
        "active": True,
    },
    {
        "name": "Pink Lagoon Decaf",
        "description": "A balanced decaf coffee with soft chocolate, honey, and toasted grain notes.",
        "category": "Coffee Beans",
        "price": Decimal("17.50"),
        "image_url": "https://placehold.co/800x600/png?text=Pink+Lagoon+Decaf",
        "roast_level": "Medium",
        "origin": "Colombia",
        "size": "12 oz",
        "active": True,
    },
    {
        "name": "Coastal Cold Brew Blend",
        "description": "A low-acid blend built for cold brew with chocolate, molasses, and orange zest notes.",
        "category": "Coffee Beans",
        "price": Decimal("19.00"),
        "image_url": "https://placehold.co/800x600/png?text=Coastal+Cold+Brew",
        "roast_level": "Dark",
        "origin": "Brazil and Ethiopia",
        "size": "12 oz",
        "active": True,
    },
    {
        "name": "Ethiopia Yirgacheffe",
        "description": "A floral single-origin coffee with jasmine, peach, and lemon tea notes.",
        "category": "Single Origin",
        "price": Decimal("21.00"),
        "image_url": "https://placehold.co/800x600/png?text=Ethiopia+Yirgacheffe",
        "roast_level": "Light",
        "origin": "Yirgacheffe, Ethiopia",
        "size": "12 oz",
        "active": True,
    },
]


def seed_products(db: Session) -> None:
    has_products = db.query(Product).first() is not None

    if has_products:
        return

    db.add_all(Product(**product) for product in SEED_PRODUCTS)
    db.commit()

