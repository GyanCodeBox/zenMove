"""Initial Phase 1 schema — users, moves, items

Revision ID: 0001_phase1_initial
Revises:
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0001_phase1_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("customer", "packer", "driver", "admin", name="userrole"), nullable=False),
        sa.Column("kyc_status", sa.Enum("pending", "verified", "rejected", name="kycstatus"), nullable=False, server_default="pending"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── moves ──────────────────────────────────────────────────────────
    op.create_table(
        "moves",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vendor_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.Enum(
            "quoted", "booked", "loading", "in_transit", "delivered",
            "disputed", "completed", name="movestatus"
        ), nullable=False, server_default="quoted"),
        sa.Column("origin_address", sa.Text(), nullable=False),
        sa.Column("dest_address", sa.Text(), nullable=False),
        sa.Column("origin_city_code", sa.String(10), nullable=False),
        sa.Column("dest_city_code", sa.String(10), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("quote_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("escrow_id", sa.String(255), nullable=True),
        sa.Column("eway_bill_no", sa.String(50), nullable=True),
        sa.Column("delivery_otp_hash", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_moves_customer_id", "moves", ["customer_id"])
    op.create_index("ix_moves_status", "moves", ["status"])

    # ── items ──────────────────────────────────────────────────────────
    op.create_table(
        "items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("move_id", UUID(as_uuid=True), sa.ForeignKey("moves.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("condition_pre", sa.Enum("good", "fragile", "damaged", name="itemcondition"), nullable=False),
        sa.Column("condition_post", sa.Enum("good", "fragile", "damaged", "missing", name="itemconditionpost"), nullable=True),
        sa.Column("qr_code", sa.String(100), nullable=True),
        sa.Column("tag_tier", sa.Enum("PVC", "PAPER", name="tagtier"), nullable=True),
        sa.Column("is_high_risk", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("open_photo_key", sa.Text(), nullable=True),
        sa.Column("sealed_photo_key", sa.Text(), nullable=True),
        sa.Column("open_photo_hash", sa.String(64), nullable=True),
        sa.Column("sealed_photo_hash", sa.String(64), nullable=True),
        sa.Column("is_loaded", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_unloaded", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("loaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unloaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_items_move_id", "items", ["move_id"])
    op.create_index("ix_items_qr_code", "items", ["qr_code"], unique=True)


def downgrade() -> None:
    op.drop_table("items")
    op.drop_table("moves")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS tagtier")
    op.execute("DROP TYPE IF EXISTS itemconditionpost")
    op.execute("DROP TYPE IF EXISTS itemcondition")
    op.execute("DROP TYPE IF EXISTS movestatus")
    op.execute("DROP TYPE IF EXISTS kycstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
