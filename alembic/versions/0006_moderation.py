"""add merchant verification and offer moderation

Revision ID: 0006_moderation
Revises: 0005_notifications
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_moderation"
down_revision = "0005_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("merchants", sa.Column("verification_status", sa.String(length=20), nullable=False, server_default="PENDING"))
    op.add_column("merchants", sa.Column("verification_reason", sa.Text(), nullable=True))
    op.create_index("ix_merchants_verification_status", "merchants", ["verification_status"])
    op.execute("UPDATE merchants SET verification_status = 'VERIFIED'")

    op.add_column("food_offers", sa.Column("moderation_status", sa.String(length=20), nullable=False, server_default="PENDING"))
    op.add_column("food_offers", sa.Column("moderation_reason", sa.Text(), nullable=True))
    op.add_column("food_offers", sa.Column("moderated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_food_offers_moderation_status", "food_offers", ["moderation_status"])
    op.execute("UPDATE food_offers SET moderation_status = 'APPROVED'")


def downgrade() -> None:
    op.drop_index("ix_food_offers_moderation_status", table_name="food_offers")
    op.drop_column("food_offers", "moderated_at")
    op.drop_column("food_offers", "moderation_reason")
    op.drop_column("food_offers", "moderation_status")

    op.drop_index("ix_merchants_verification_status", table_name="merchants")
    op.drop_column("merchants", "verification_reason")
    op.drop_column("merchants", "verification_status")
