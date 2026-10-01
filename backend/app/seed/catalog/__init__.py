from __future__ import annotations

from app.domain.entities.component import ComponentCategory
from app.seed.catalog.analog import ACTUATORS, PASSIVES, POWER, SEMICONDUCTORS
from app.seed.catalog.breadboard import BREADBOARD
from app.seed.catalog.builder import Entry, component
from app.seed.catalog.embedded import BOARDS, PERIPHERALS, SENSORS
from app.seed.catalog.logic import LOGIC
from app.seed.catalog.sensors_robu import SENSORS_ROBU

BOARD_OUTLINE = component(
    "blank_pcb",
    "Blank PCB",
    ComponentCategory.PCB,
    [],
    subcategory="board",
    description="Empty board outline to place anything on",
)

CATALOG: list[Entry] = [
    *PASSIVES,
    *SEMICONDUCTORS,
    *POWER,
    *ACTUATORS,
    *PERIPHERALS,
    *SENSORS,
    *SENSORS_ROBU,
    *BOARDS,
    *LOGIC,
    *BREADBOARD,
    BOARD_OUTLINE,
]

__all__ = ["CATALOG"]
