from __future__ import annotations

from app.domain.entities.component import ComponentCategory
from app.seed.catalog.builder import Entry, component

# Holes/handles are supplied by the frontend part art; columns of 5 holes and the
# power rails are wired together automatically by the board (no device behaviour).
BREADBOARD: list[Entry] = [
    component(
        "breadboard_half",
        "Breadboard (half+)",
        ComponentCategory.CONNECTOR,
        [],
        subcategory="breadboard",
        description=(
            "Solderless prototyping board. Each column of 5 holes shares an internal "
            "strip and the +/- power rails run the full length."
        ),
        tags=["breadboard", "prototype", "jumper", "solderless"],
    ),
]
