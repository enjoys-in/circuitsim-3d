"""Circuit graph entities: placed instances and nets."""
from __future__ import annotations

from pydantic import BaseModel, Field


class Position(BaseModel):
    x: float = 0.0
    y: float = 0.0


class ComponentInstance(BaseModel):
    """A component placed on the canvas."""

    id: str
    component_key: str
    label: str = ""
    position: Position = Field(default_factory=Position)
    params: dict[str, object] = Field(default_factory=dict)


class Net(BaseModel):
    """An electrical connection between instance pins.

    Endpoints are encoded as "<instance_id>:<pin_name>".
    """

    id: str
    name: str = ""
    endpoints: list[str] = Field(default_factory=list)


class Circuit(BaseModel):
    instances: list[ComponentInstance] = Field(default_factory=list)
    nets: list[Net] = Field(default_factory=list)
