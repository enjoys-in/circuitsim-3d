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


class VerifyVector(BaseModel):
    """One test case: input part values keyed by instance id, with optional expected outputs."""

    inputs: dict[str, int]
    expected: dict[str, int] | None = None


class VerifyRequest(BaseModel):
    """Run a circuit against a suite of input vectors and compare to expected outputs."""

    circuit: Circuit
    vectors: list[VerifyVector]
    engine: str | None = None
    options: dict[str, object] = {}


class VerifyPort(BaseModel):
    id: str
    label: str


class VerifyRow(BaseModel):
    inputs: dict[str, int]
    outputs: dict[str, int | None]
    expected: dict[str, int] | None = None
    passed: bool | None = None


class VerifyResponse(BaseModel):
    engine: str
    inputs: list[VerifyPort]
    outputs: list[VerifyPort]
    rows: list[VerifyRow]
    passed: int
    failed: int
    total: int


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
