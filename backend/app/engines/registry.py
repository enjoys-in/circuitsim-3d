from __future__ import annotations

from app.core.exceptions import NotFoundError, ValidationError
from app.domain.engines import SimulationEngine
from app.domain.entities.project import Circuit


class EngineRegistry:
    def __init__(self) -> None:
        self._engines: dict[str, SimulationEngine] = {}

    def register(self, engine: SimulationEngine) -> None:
        self._engines[engine.name] = engine

    def get(self, name: str) -> SimulationEngine:
        engine = self._engines.get(name)
        if engine is None:
            raise NotFoundError(f"Simulation engine '{name}' is not registered")
        return engine

    def select(self, circuit: Circuit) -> SimulationEngine:
        if not circuit.instances:
            raise ValidationError("Add some components to the board before simulating")
        for engine in self._engines.values():
            if engine.supports(circuit):
                return engine
        keys = ", ".join(sorted({i.component_key for i in circuit.instances}))
        raise ValidationError(
            f"No engine can simulate this mix of parts ({keys}). Logic gates run on their own, "
            "analog parts run on their own, and MCU boards can drive analog parts and sensors."
        )

    def names(self) -> list[str]:
        return list(self._engines)
