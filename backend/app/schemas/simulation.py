"""API DTOs for simulation runs."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.entities.project import Circuit


class SimulationRequest(BaseModel):
    """Run a simulation against an ad-hoc circuit (no persistence required)."""

    circuit: Circuit
    engine: str | None = None
    options: dict[str, object] = {}


class SimulationResult(BaseModel):
    engine: str
    results: dict[str, object]


class SimulationRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    engine: str
    status: str
    results: dict[str, object]
    error: str | None
    created_at: datetime
    updated_at: datetime
