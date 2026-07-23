"""Add payment/order security state and webhook audit records.

Revision ID: 0002_payment_order_security
Revises: 0001_adopt_existing_schema
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_payment_order_security"
down_revision = "0001_adopt_existing_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    order_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("orders")
    }
    if "guest_access_token_hash" not in order_columns:
        op.add_column(
            "orders", sa.Column("guest_access_token_hash", sa.String(64), nullable=True)
        )
        op.create_index(
            "ix_orders_guest_access_token_hash",
            "orders",
            ["guest_access_token_hash"],
            unique=True,
        )
    if "currency" not in order_columns:
        op.add_column(
            "orders",
            sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        )
    if "square_location_id" not in order_columns:
        op.add_column(
            "orders", sa.Column("square_location_id", sa.String(120), nullable=True)
        )

    with op.batch_alter_table("orders") as batch_op:
        batch_op.alter_column(
            "payment_status",
            existing_type=sa.String(40),
            nullable=False,
            server_default="pending_payment",
        )

    if "webhook_events" not in set(sa.inspect(bind).get_table_names()):
        op.create_table(
            "webhook_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("provider", sa.String(40), nullable=False),
            sa.Column("provider_event_id", sa.String(160), nullable=False),
            sa.Column("event_type", sa.String(120), nullable=False),
            sa.Column(
                "processing_status",
                sa.String(40),
                nullable=False,
                server_default="processing",
            ),
            sa.Column(
                "order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=True
            ),
            sa.Column("error_description", sa.String(255), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column("processed_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint(
                "provider_event_id", name="uq_webhook_provider_event_id"
            ),
        )
        op.create_index("ix_webhook_events_order_id", "webhook_events", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_webhook_events_order_id", table_name="webhook_events")
    op.drop_table("webhook_events")
    with op.batch_alter_table("orders") as batch_op:
        batch_op.alter_column(
            "payment_status",
            existing_type=sa.String(40),
            nullable=False,
            server_default="paid",
        )
    op.drop_column("orders", "square_location_id")
    op.drop_column("orders", "currency")
    op.drop_index("ix_orders_guest_access_token_hash", table_name="orders")
    op.drop_column("orders", "guest_access_token_hash")
