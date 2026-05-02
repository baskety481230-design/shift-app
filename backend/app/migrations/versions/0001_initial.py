"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("google_sub", sa.String(64), nullable=True, unique=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("role", sa.String(16), nullable=False, server_default="staff"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("hourly_wage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("theme_color", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("theme_pattern", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notify_minutes_before", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("notify_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_google_sub", "users", ["google_sub"])

    op.create_table(
        "invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("role", sa.String(16), nullable=False, server_default="staff"),
        sa.Column("invited_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_invites_email", "invites", ["email"])

    op.create_table(
        "shifts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("shift_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("break_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="requested"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "shift_date", "start_time", name="uq_shift_user_date_start"),
    )
    op.create_index("ix_shifts_user_id", "shifts", ["user_id"])
    op.create_index("ix_shifts_shift_date", "shifts", ["shift_date"])
    op.create_index("ix_shifts_status", "shifts", ["status"])

    op.create_table(
        "shift_swaps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("requester_shift_id", sa.Integer(), sa.ForeignKey("shifts.id"), nullable=False),
        sa.Column("target_shift_id", sa.Integer(), sa.ForeignKey("shifts.id"), nullable=True),
        sa.Column("status", sa.String(24), nullable=False, server_default="pending_peer"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_shift_swaps_requester_id", "shift_swaps", ["requester_id"])
    op.create_index("ix_shift_swaps_target_user_id", "shift_swaps", ["target_user_id"])
    op.create_index("ix_shift_swaps_status", "shift_swaps", ["status"])

    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False, unique=True),
        sa.Column("p256dh", sa.String(255), nullable=False),
        sa.Column("auth", sa.String(255), nullable=False),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])

    op.create_table(
        "notification_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("minutes_before", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("notification_settings")
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    op.drop_index("ix_shift_swaps_status", table_name="shift_swaps")
    op.drop_index("ix_shift_swaps_target_user_id", table_name="shift_swaps")
    op.drop_index("ix_shift_swaps_requester_id", table_name="shift_swaps")
    op.drop_table("shift_swaps")
    op.drop_index("ix_shifts_status", table_name="shifts")
    op.drop_index("ix_shifts_shift_date", table_name="shifts")
    op.drop_index("ix_shifts_user_id", table_name="shifts")
    op.drop_table("shifts")
    op.drop_index("ix_invites_email", table_name="invites")
    op.drop_table("invites")
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
