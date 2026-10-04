"""add merchant coordinates

Revision ID: 0004_merchant_location
Revises: 0003_audit_logs
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_merchant_location"
down_revision = "0003_audit_logs"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("merchants", sa.Column("latitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("merchants", sa.Column("longitude", sa.Numeric(9, 6), nullable=True))
    op.create_index("ix_merchants_city", "merchants", ["city"])

def downgrade() -> None:
    op.drop_index("ix_merchants_city", table_name="merchants")
    op.drop_column("merchants", "longitude")
    op.drop_column("merchants", "latitude")
