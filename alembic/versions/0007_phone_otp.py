"""support phone-first accounts and one-time password codes

Revision ID: 0007_phone_otp
Revises: 0006_moderation
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_phone_otp"
down_revision = "0006_moderation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=True)
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=True)
    op.add_column("users", sa.Column("phone_number", sa.String(length=16), nullable=True))
    op.create_index("ix_users_phone_number", "users", ["phone_number"], unique=True)

    op.create_table(
        "phone_otps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone_number", sa.String(length=16), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_phone_otps_phone_number", "phone_otps", ["phone_number"])
    op.create_index("ix_phone_otps_expires_at", "phone_otps", ["expires_at"])
    op.create_index("ix_phone_otps_created_at", "phone_otps", ["created_at"])
    op.create_index("ix_phone_otps_phone_created", "phone_otps", ["phone_number", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_phone_otps_phone_created", table_name="phone_otps")
    op.drop_index("ix_phone_otps_created_at", table_name="phone_otps")
    op.drop_index("ix_phone_otps_expires_at", table_name="phone_otps")
    op.drop_index("ix_phone_otps_phone_number", table_name="phone_otps")
    op.drop_table("phone_otps")
    op.drop_index("ix_users_phone_number", table_name="users")
    op.drop_column("users", "phone_number")
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=False)
