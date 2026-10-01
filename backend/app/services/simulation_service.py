"""Business logic for running simulations."""
from __future__ import annotations

from app.domain.entities.project import Circuit
from app.engines.registry import EngineRegistry


class SimulationService:
    def __init__(self, registry: EngineRegistry) -> None:
        self._registry = registry

    def engines(self) -> list[str]:
        return self._registry.names()

    def run(
        self,
        circuit: Circuit,
        *,
        engine: str | None = None,
        options: dict[str, object] | None = None,
    ) -> dict[str, object]:
        selected = (
            self._registry.get(engine) if engine else self._registry.select(circuit)
        )
        results = selected.run(circuit, options or {})
        return {"engine": selected.name, "results": results}
