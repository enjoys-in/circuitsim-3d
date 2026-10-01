"""Pure domain entities and value objects (framework-independent)."""
from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class PinDirection(StrEnum):
    INPUT = "input"
    OUTPUT = "output"
    BIDIRECTIONAL = "bidirectional"
    POWER = "power"
    GROUND = "ground"
    PASSIVE = "passive"


class ComponentCategory(StrEnum):
    PASSIVE = "passive"
    SWITCH = "switch"
    SEMICONDUCTOR = "semiconductor"
    POWER = "power"
    SENSOR = "sensor"
    DEV_BOARD = "dev_board"
    LOGIC = "logic"
    CONNECTOR = "connector"
    PCB = "pcb"
    ACTUATOR = "actuator"


class Pin(BaseModel):
    name: str
    direction: PinDirection = PinDirection.PASSIVE
    x: float = 0.0
    y: float = 0.0


class Component(BaseModel):
    """A catalog component definition (a template, not a placed instance)."""

    key: str = Field(..., description="Unique machine key, e.g. 'resistor'")
    name: str
    category: ComponentCategory
    subcategory: str | None = None
    description: str = ""
    pins: list[Pin] = Field(default_factory=list)
    default_params: dict[str, object] = Field(default_factory=dict)
    spice_model: str | None = None
    footprint: str | None = None
    symbol: str | None = None
    tags: list[str] = Field(default_factory=list)
