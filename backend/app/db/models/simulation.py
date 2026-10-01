"""ORM model for a simulation run and its results."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDMixin


class SimulationRunModel(UUIDMixin, TimestampMixin, Base):
    """A single execution of a simulation engine against a project."""

    __tablename__ = "simulation_runs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    engine: Mapped[str] = mapped_column(String(40), default="digital")
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    results: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(String(1000), nullable=True)
