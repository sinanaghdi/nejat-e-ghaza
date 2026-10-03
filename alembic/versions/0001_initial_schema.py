"""create initial schema"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels = None
depends_on = None

user_role = sa.Enum("CUSTOMER", "MERCHANT", "ADMIN", name="userrole")
order_status = sa.Enum("PENDING", "PAID", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED", "EXPIRED", name="orderstatus")

def upgrade() -> None:
    user_role.create(op.get_bind(), checkfirst=True)
    order_status.create(op.get_bind(), checkfirst=True)
    op.create_table("users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("email"))
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table("merchants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("business_name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id"))
    op.create_table("food_offers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("merchant_id", sa.Integer(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("original_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("sale_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("available_quantity", sa.Integer(), nullable=False),
        sa.Column("pickup_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pickup_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_food_offers_merchant_id", "food_offers", ["merchant_id"])
    op.create_check_constraint("ck_food_offers_original_price_positive", "food_offers", "original_price > 0")
    op.create_check_constraint("ck_food_offers_sale_price_positive", "food_offers", "sale_price > 0")
    op.create_check_constraint("ck_food_offers_sale_lte_original", "food_offers", "sale_price <= original_price")
    op.create_check_constraint("ck_food_offers_quantity_positive", "food_offers", "quantity > 0")
    op.create_check_constraint("ck_food_offers_available_nonnegative", "food_offers", "available_quantity >= 0")
    op.create_table("orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("merchant_id", sa.Integer(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", order_status, nullable=False),
        sa.Column("pickup_code", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("pickup_code"))
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_merchant_id", "orders", ["merchant_id"])
    op.create_table("order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("food_offer_id", sa.Integer(), sa.ForeignKey("food_offers.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False))
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_food_offer_id", "order_items", ["food_offer_id"])
    op.create_check_constraint("ck_order_items_quantity_positive", "order_items", "quantity > 0")

def downgrade() -> None:
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("food_offers")
    op.drop_table("merchants")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    order_status.drop(op.get_bind(), checkfirst=True)
    user_role.drop(op.get_bind(), checkfirst=True)
