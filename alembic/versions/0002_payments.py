"""add payments"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_payments"
down_revision: Union[str, Sequence[str], None] = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("authority", sa.String(255), nullable=False),
        sa.Column("reference_id", sa.String(255), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("order_id"),
        sa.UniqueConstraint("authority"),
    )
    op.create_index("ix_payments_order_id", "payments", ["order_id"])
    op.create_index("ix_payments_authority", "payments", ["authority"])


def downgrade() -> None:
    op.drop_index("ix_payments_authority", table_name="payments")
    op.drop_index("ix_payments_order_id", table_name="payments")
    op.drop_table("payments")
