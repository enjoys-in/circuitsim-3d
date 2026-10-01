"""ORM model for the reusable component catalog."""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDMixin


class ComponentModel(UUIDMixin, TimestampMixin, Base):
    """A catalog definition of a placeable component (not an instance)."""

    __tablename__ = "components"

    key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(80), index=True)
    subcategory: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")

    # Visual + electrical interface
    pins: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    default_params: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Simulation / fabrication metadata (optional per component)
    spice_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    footprint: Mapped[str | None] = mapped_column(String(200), nullable=True)
    symbol: Mapped[str | None] = mapped_column(String(200), nullable=True)

    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
