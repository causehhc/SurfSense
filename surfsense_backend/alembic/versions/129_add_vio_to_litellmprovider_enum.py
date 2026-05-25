"""Add VIO to LiteLLMProvider enum

Revision ID: 129
Revises: 128
"""

from collections.abc import Sequence

from alembic import op

revision: str = "129"
down_revision: str | None = "128"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("COMMIT")
    op.execute("ALTER TYPE litellmprovider ADD VALUE IF NOT EXISTS 'VIO'")


def downgrade() -> None:
    pass
