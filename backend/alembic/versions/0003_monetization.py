"""monetization: plan fields on users + billing_payments, referrals, app_banners

Revision ID: 0003_monetization
Revises: 0002_device_tokens
Create Date: 2026-06-26

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0003_monetization"
down_revision: Union[str, None] = "0002_device_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# create_type=False: los tipos se crean explícitamente en upgrade() con checkfirst=True,
# para que add_column/create_table NO vuelvan a emitir CREATE TYPE (evita "type already exists").
user_plan = postgresql.ENUM("free", "premium", name="user_plan", create_type=False)
billing_kind = postgresql.ENUM("credits", "premium", name="billing_kind", create_type=False)
billing_status = postgresql.ENUM(
    "pending", "approved", "rejected", "refunded", name="billing_status", create_type=False
)
referral_status = postgresql.ENUM(
    "pending", "qualified", "rewarded", name="referral_status", create_type=False
)
banner_audience = postgresql.ENUM("all", "free_only", name="banner_audience", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    for enum in (user_plan, billing_kind, billing_status, referral_status, banner_audience):
        enum.create(bind, checkfirst=True)

    # --- users: plan fields ---
    op.add_column(
        "users",
        sa.Column("plan", user_plan, nullable=False, server_default="free"),
    )
    op.add_column("users", sa.Column("premium_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column("event_credits", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("users", sa.Column("referral_code", sa.String(8), nullable=True))
    op.create_index("ix_users_referral_code", "users", ["referral_code"], unique=True)

    # --- billing_payments ---
    op.create_table(
        "billing_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", billing_kind, nullable=False),
        sa.Column("pack_code", sa.String(40), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="PEN"),
        sa.Column("mp_preference_id", sa.String(120), nullable=True),
        sa.Column("mp_payment_id", sa.String(120), nullable=True),
        sa.Column("status", billing_status, nullable=False, server_default="pending"),
        sa.Column("credits_granted", sa.Integer(), nullable=True),
        sa.Column("premium_days", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_billing_payments_user_id", "billing_payments", ["user_id"])
    op.create_index("ix_billing_payments_mp_preference_id", "billing_payments", ["mp_preference_id"])
    op.create_index(
        "ix_billing_payments_mp_payment_id", "billing_payments", ["mp_payment_id"], unique=True
    )

    # --- referrals ---
    op.create_table(
        "referrals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "referrer_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "referred_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", referral_status, nullable=False, server_default="pending"),
        sa.Column("device_hash", sa.String(128), nullable=True),
        sa.Column("qualified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rewarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_referrals_referrer_user_id", "referrals", ["referrer_user_id"])
    op.create_index("ix_referrals_referred_user_id", "referrals", ["referred_user_id"])
    op.create_index("ix_referrals_device_hash", "referrals", ["device_hash"])

    # --- app_banners ---
    op.create_table(
        "app_banners",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(160), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=False),
        sa.Column("link_url", sa.String(500), nullable=True),
        sa.Column("audience", banner_audience, nullable=False, server_default="all"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("app_banners")
    op.drop_index("ix_referrals_device_hash", table_name="referrals")
    op.drop_index("ix_referrals_referred_user_id", table_name="referrals")
    op.drop_index("ix_referrals_referrer_user_id", table_name="referrals")
    op.drop_table("referrals")
    op.drop_index("ix_billing_payments_mp_payment_id", table_name="billing_payments")
    op.drop_index("ix_billing_payments_mp_preference_id", table_name="billing_payments")
    op.drop_index("ix_billing_payments_user_id", table_name="billing_payments")
    op.drop_table("billing_payments")
    op.drop_index("ix_users_referral_code", table_name="users")
    op.drop_column("users", "referral_code")
    op.drop_column("users", "event_credits")
    op.drop_column("users", "premium_until")
    op.drop_column("users", "plan")

    bind = op.get_bind()
    for enum in (banner_audience, referral_status, billing_status, billing_kind, user_plan):
        enum.drop(bind, checkfirst=True)
