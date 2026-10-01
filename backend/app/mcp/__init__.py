"""Model Context Protocol server for CircuitSim.

Exposes the simulator's design catalog, circuit builder and simulation engines
as MCP tools/resources so any MCP client (IDE assistant, agent, CLI) can design
and run circuits. All behaviour is delegated to the reusable :class:`SimulationStudio`
facade, which simply wires the existing app services together (no duplication).
"""
from __future__ import annotations

from app.mcp.studio import SimulationStudio

__all__ = ["SimulationStudio"]
