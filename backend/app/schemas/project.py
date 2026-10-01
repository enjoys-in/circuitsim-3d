"""API DTOs for design projects."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.entities.project import Circuit


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    circuit: Circuit = Circuit()


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    circuit: Circuit | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    circuit: dict[str, object]
    created_at: datetime
    updated_at: datetime
