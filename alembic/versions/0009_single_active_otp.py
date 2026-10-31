"""enforce a single active phone OTP per number

Revision ID: 0009_single_active_otp
Revises: 0008_settlements
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_single_active_otp"
down_revision = "0008_settlements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Preserve OTP history. For pre-existing duplicate unconsumed codes, keep
    # the newest row and mark older rows consumed before creating the index.
    op.execute(
        sa.text(
            """
            WITH ranked AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY phone_number
                        ORDER BY created_at DESC, id DESC
                    ) AS position
                FROM phone_otps
                WHERE consumed_at IS NULL
            )
            UPDATE phone_otps AS otp
            SET consumed_at = COALESCE(otp.created_at, CURRENT_TIMESTAMP)
            FROM ranked
            WHERE otp.id = ranked.id
              AND ranked.position > 1
            """
        )
    )
    op.create_index(
        "uq_phone_otps_active_phone",
        "phone_otps",
        ["phone_number"],
        unique=True,
        postgresql_where=sa.text("consumed_at IS NULL"),
        sqlite_where=sa.text("consumed_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_phone_otps_active_phone", table_name="phone_otps")
