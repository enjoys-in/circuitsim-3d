"""Abstract interface for pluggable simulation engines.

Each engine (digital, analog/ngspice, mcu) implements this contract so the
service layer stays open for extension but closed for modification (OCP).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.domain.entities.project import Circuit


class SimulationEngine(ABC):
    """Compile a circuit graph and run it, returning engine-specific results."""

    #: Stable identifier used to select the engine, e.g. "digital".
    name: str

    @abstractmethod
    def supports(self, circuit: Circuit) -> bool:
        """Return True if this engine can simulate the given circuit."""

    @abstractmethod
    def run(self, circuit: Circuit, options: dict[str, Any]) -> dict[str, Any]:
        """Execute the simulation and return a JSON-serializable result."""
