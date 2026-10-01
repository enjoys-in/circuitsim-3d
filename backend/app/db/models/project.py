"""ORM model for a saved circuit/PCB design project."""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDMixin


class ProjectModel(UUIDMixin, TimestampMixin, Base):
    """A user design: placed component instances + nets, stored as a graph."""

    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str] = mapped_column(Text, default="")

    # Serialized circuit graph: {"instances": [...], "nets": [...]}
    circuit: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
