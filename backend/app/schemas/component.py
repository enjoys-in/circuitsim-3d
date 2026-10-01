"""API DTOs for the component catalog."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.entities.component import ComponentCategory, Pin


class ComponentCreate(BaseModel):
    key: str
    name: str
    category: ComponentCategory
    subcategory: str | None = None
    description: str = ""
    pins: list[Pin] = []
    default_params: dict[str, object] = {}
    spice_model: str | None = None
    footprint: str | None = None
    symbol: str | None = None
    tags: list[str] = []


class ComponentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    name: str
    category: str
    subcategory: str | None
    description: str
    pins: list[dict[str, object]]
    default_params: dict[str, object]
    spice_model: str | None
    footprint: str | None
    symbol: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime
