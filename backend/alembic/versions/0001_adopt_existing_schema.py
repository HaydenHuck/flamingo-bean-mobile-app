"""Adopt or create the pre-hardening schema.

Revision ID: 0001_adopt_existing_schema
Revises:
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_adopt_existing_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    if "products" not in existing:
        op.create_table(
            "products",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("category", sa.String(120), nullable=False),
            sa.Column("price", sa.Numeric(10, 2), nullable=False),
            sa.Column("image_url", sa.String(500), nullable=False, server_default=""),
            sa.Column("roast_level", sa.String(80), nullable=False),
            sa.Column("origin", sa.String(120), nullable=False),
            sa.Column("size", sa.String(80), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )
        op.create_index("ix_products_name", "products", ["name"])
        op.create_index("ix_products_category", "products", ["category"])

    if "admin_users" not in existing:
        op.create_table(
            "admin_users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(255), nullable=False),
            sa.Column("password_hash", sa.String(255), nullable=False),
            sa.Column("role", sa.String(80), nullable=False, server_default="admin"),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.UniqueConstraint("email", name="uq_admin_users_email"),
        )
        op.create_index("ix_admin_users_email", "admin_users", ["email"], unique=True)

    if "orders" not in existing:
        op.create_table(
            "orders",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("order_number", sa.String(40), nullable=False),
            sa.Column(
                "status", sa.String(40), nullable=False, server_default="received"
            ),
            sa.Column("customer_name", sa.String(255), nullable=False),
            sa.Column("customer_email", sa.String(255), nullable=False),
            sa.Column("customer_firebase_uid", sa.String(128), nullable=True),
            sa.Column("customer_account_email", sa.String(255), nullable=True),
            sa.Column("guest_email", sa.String(255), nullable=True),
            sa.Column("guest_lookup_code", sa.String(80), nullable=True),
            sa.Column("fulfillment_type", sa.String(80), nullable=False),
            sa.Column("pickup_time", sa.String(120), nullable=True),
            sa.Column("shipping_name", sa.String(255), nullable=True),
            sa.Column("shipping_address_line1", sa.String(255), nullable=True),
            sa.Column("shipping_address_line2", sa.String(255), nullable=True),
            sa.Column("shipping_city", sa.String(120), nullable=True),
            sa.Column("shipping_state", sa.String(80), nullable=True),
            sa.Column("shipping_zip", sa.String(40), nullable=True),
            sa.Column("shipping_country", sa.String(80), nullable=True),
            sa.Column(
                "payment_status", sa.String(40), nullable=False, server_default="paid"
            ),
            sa.Column("square_payment_link_id", sa.String(120), nullable=True),
            sa.Column("square_payment_id", sa.String(120), nullable=True),
            sa.Column("square_order_id", sa.String(120), nullable=True),
            sa.Column("square_checkout_url", sa.String(500), nullable=True),
            sa.Column("subtotal", sa.Numeric(10, 2), nullable=False),
            sa.Column("tax", sa.Numeric(10, 2), nullable=False),
            sa.Column(
                "shipping_fee", sa.Numeric(10, 2), nullable=False, server_default="0"
            ),
            sa.Column("total", sa.Numeric(10, 2), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.UniqueConstraint("order_number", name="uq_orders_order_number"),
        )
        op.create_index(
            "ix_orders_order_number", "orders", ["order_number"], unique=True
        )
        op.create_index(
            "ix_orders_customer_firebase_uid", "orders", ["customer_firebase_uid"]
        )
        op.create_index(
            "ix_orders_customer_account_email", "orders", ["customer_account_email"]
        )
        op.create_index("ix_orders_guest_email", "orders", ["guest_email"])

    existing = set(sa.inspect(op.get_bind()).get_table_names())
    if "order_items" not in existing:
        op.create_table(
            "order_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False
            ),
            sa.Column(
                "product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False
            ),
            sa.Column("product_name_snapshot", sa.String(255), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
            sa.Column("line_total", sa.Numeric(10, 2), nullable=False),
            sa.Column("size", sa.String(80), nullable=False),
        )
        op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
        op.create_index("ix_order_items_product_id", "order_items", ["product_id"])


def downgrade() -> None:
    # This adoption revision intentionally preserves pre-existing development data.
    pass
