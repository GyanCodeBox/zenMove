"""Phase 2 schema — escrow_orders, escrow_milestones, wallet_draw_requests, disputes, eway_bills

Revision ID: 0002_phase2_escrow
Revises: 0001_phase1_initial
Create Date: 2026-04-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0002_phase2_escrow"
down_revision = "0001_phase1_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── escrow_orders ──────────────────────────────────────────────────
    op.create_table(
        "escrow_orders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("move_id", UUID(as_uuid=True), sa.ForeignKey("moves.id"), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("vault_balance", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_ref", sa.String(255), nullable=True),
        sa.Column("razorpay_order_id", sa.String(255), nullable=True),
        sa.Column("platform_fee_pct", sa.Numeric(5, 2), nullable=False, server_default="10.00"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_escrow_orders_move_id", "escrow_orders", ["move_id"], unique=True)

    # ── escrow_milestones ──────────────────────────────────────────────
    op.create_table(
        "escrow_milestones",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("order_id", UUID(as_uuid=True), sa.ForeignKey("escrow_orders.id"), nullable=False),
        sa.Column("move_id", UUID(as_uuid=True), sa.ForeignKey("moves.id"), nullable=False),
        sa.Column("milestone", sa.Enum(
            "M1_booking", "M2_loading", "M3_delivery", "M4_closeout",
            name="milestonekey"
        ), nullable=False),
        sa.Column("pct_of_total", sa.Numeric(5, 2), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.Enum(
            "pending", "released", "held", "refunded",
            name="milestonestatus"
        ), nullable=False, server_default="pending"),
        sa.Column("trigger_event", sa.String(255), nullable=True),
        sa.Column("payment_ref", sa.String(255), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_escrow_milestones_move_id", "escrow_milestones", ["move_id"])

    # ── wallet_draw_requests ───────────────────────────────────────────
    op.create_table(
        "wallet_draw_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("move_id", UUID(as_uuid=True), sa.ForeignKey("moves.id"), nullable=False),
        sa.Column("vendor_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("receipt_s3_key", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_wallet_draws_move_id", "wallet_draw_requests", ["move_id"])

    # ── disputes ───────────────────────────────────────────────────────
    op.create_table(
        "disputes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("move_id", UUID(as_uuid=True), sa.ForeignKey("moves.id"), nullable=False),
        sa.Column("item_id", UUID(as_uuid=True), sa.ForeignKey("items.id"), nullable=True),
        sa.Column("raised_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("dispute_type", sa.Enum(
            "damage", "missing", "delay", "overcharge", name="disputetype"
        ), nullable=False),
        sa.Column("status", sa.Enum(
            "open", "vendor_review", "ai_review", "human_review",
            "resolved_customer", "resolved_vendor", "partial_settlement", "withdrawn",
            name="disputestatus"
        ), nullable=False, server_default="open"),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("damage_photo_key", sa.Text(), nullable=True),
        sa.Column("ai_verdict", JSONB, nullable=True),
        sa.Column("vendor_response", sa.Text(), nullable=True),
        sa.Column("vendor_responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("resolved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("escrow_hold_amount", sa.String(20), nullable=True),
        sa.Column("refund_amount", sa.String(20), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_disputes_move_id", "disputes", ["move_id"])
    op.create_index("ix_disputes_status", "disputes", ["status"])

    # ── eway_bills ─────────────────────────────────────────────────────
    op.create_table(
        "eway_bills",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("move_id", UUID(as_uuid=True), sa.ForeignKey("moves.id"), nullable=False),
        sa.Column("ewb_no", sa.String(20), nullable=True),
        sa.Column("ewb_date", sa.String(30), nullable=True),
        sa.Column("valid_upto", sa.String(30), nullable=True),
        sa.Column("gstin_supplier", sa.String(20), nullable=True),
        sa.Column("gstin_recipient", sa.String(20), nullable=True),
        sa.Column("vehicle_no", sa.String(20), nullable=True),
        sa.Column("distance_km", sa.Integer(), nullable=True),
        sa.Column("total_value", sa.Numeric(12, 2), nullable=True),
        sa.Column("nic_response", sa.Text(), nullable=True),
        sa.Column("is_sandbox", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_eway_bills_move_id", "eway_bills", ["move_id"], unique=True)


def downgrade() -> None:
    op.drop_table("eway_bills")
    op.drop_table("disputes")
    op.drop_table("wallet_draw_requests")
    op.drop_table("escrow_milestones")
    op.drop_table("escrow_orders")
    op.execute("DROP TYPE IF EXISTS disputestatus")
    op.execute("DROP TYPE IF EXISTS disputetype")
    op.execute("DROP TYPE IF EXISTS milestonestatus")
    op.execute("DROP TYPE IF EXISTS milestonekey")
