"""add merchant settlement ledger

Revision ID: 0008_settlements
Revises: 0007_phone_otp
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_settlements"
down_revision = "0007_phone_otp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "merchant_settlements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False, unique=True),
        sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id"), nullable=False, unique=True),
        sa.Column("merchant_id", sa.Integer(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("gross_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("commission_rate_bps", sa.Integer(), nullable=False),
        sa.Column("commission_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="PENDING", nullable=False),
        sa.Column("payout_reference", sa.String(length=255), nullable=True),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_merchant_settlements_order_id", "merchant_settlements", ["order_id"], unique=True)
    op.create_index("ix_merchant_settlements_payment_id", "merchant_settlements", ["payment_id"], unique=True)
    op.create_index("ix_merchant_settlements_merchant_id", "merchant_settlements", ["merchant_id"])
    op.create_index("ix_merchant_settlements_status", "merchant_settlements", ["status"])


def downgrade() -> None:
    op.drop_index("ix_merchant_settlements_status", table_name="merchant_settlements")
    op.drop_index("ix_merchant_settlements_merchant_id", table_name="merchant_settlements")
    op.drop_index("ix_merchant_settlements_payment_id", table_name="merchant_settlements")
    op.drop_index("ix_merchant_settlements_order_id", table_name="merchant_settlements")
    op.drop_table("merchant_settlements")
