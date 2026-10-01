from __future__ import annotations

from app.engines.analog import AnalogEngine
from app.engines.digital import DigitalEngine
from app.engines.mcu import McuEngine
from app.engines.registry import EngineRegistry


def build_default_registry() -> EngineRegistry:
    registry = EngineRegistry()
    registry.register(DigitalEngine())
    registry.register(McuEngine())
    registry.register(AnalogEngine())
    return registry


__all__ = ["AnalogEngine", "DigitalEngine", "EngineRegistry", "McuEngine", "build_default_registry"]
