from __future__ import annotations

from typing import Any

from app.domain.engines import SimulationEngine
from app.domain.entities.project import Circuit
from app.engines.custom import simulatable_keys
from app.engines.digital.elements import (
    DIGITAL_ONLY_KEYS,
    LOGIC_KEYS,
    POWER_RAILS,
    Clock,
    FlipFlop,
    LogicElement,
    LogicInput,
    Pins,
    Probe,
    Sequential,
    Signal,
    build_element,
)
from app.engines.netlist import Netlist
from app.engines.result import ResultBuilder

MAX_SETTLE_ITERATIONS = 100
MAX_CASCADE = 32
MAX_TICKS = 512


class LogicSimulation:
    def __init__(self, netlist: Netlist, elements: list[LogicElement]) -> None:
        self._netlist = netlist
        self.elements = elements
        self.sequential = [e for e in elements if isinstance(e, Sequential)]
        self._combinational = [e for e in elements if e.combinational]
        self.oscillating = False

    def step(self, tick: int) -> dict[int, Signal]:
        values = self._settle(tick)
        for _ in range(MAX_CASCADE):
            fired = [
                (el, el.next_state(self._pins(el, values)))
                for el in self.sequential
                if el.rising(self._pins(el, values))
            ]
            for el in self.sequential:
                el.remember(self._pins(el, values))
            if not fired:
                break
            for el, nxt in fired:
                el.apply(nxt)
            values = self._settle(tick)
        for element in self.elements:
            element.observe(self._pins(element, values))
        return values

    def _settle(self, tick: int) -> dict[int, Signal]:
        values: dict[int, Signal] = {}
        for element in self.elements:
            self._write(element, element.drive(tick), values)
        for _ in range(MAX_SETTLE_ITERATIONS):
            changed = False
            for element in self._combinational:
                changed |= self._write(
                    element, element.evaluate(self._pins(element, values)), values
                )
            if not changed:
                return values
        self.oscillating = True
        return values

    def _pins(self, element: LogicElement, values: dict[int, Signal]) -> Pins:
        pins: Pins = {}
        for pin in element.inputs:
            node = self._netlist.node(element.id, pin)
            pins[pin] = values.get(node) if node is not None else None
        return pins

    def _write(self, element: LogicElement, outputs: Pins, values: dict[int, Signal]) -> bool:
        changed = False
        for pin, value in outputs.items():
            node = self._netlist.node(element.id, pin)
            if node is not None and values.get(node) != value:
                values[node] = value
                changed = True
        return changed


class DigitalEngine(SimulationEngine):
    name = "digital"

    def supports(self, circuit: Circuit) -> bool:
        keys = simulatable_keys(circuit)
        logic = keys - POWER_RAILS
        if not logic or not (logic <= LOGIC_KEYS):
            return False
        # Only claim a rail-powered circuit when something is unmistakably digital, so
        # analog parts that share a key (e.g. an LED lit off a supply) stay with analog.
        if (keys & POWER_RAILS) and not (logic & DIGITAL_ONLY_KEYS):
            return False
        return True

    def run(self, circuit: Circuit, options: dict[str, Any]) -> dict[str, Any]:
        netlist = Netlist(circuit)
        elements = [e for e in map(build_element, circuit.instances) if e is not None]
        simulation = LogicSimulation(netlist, elements)
        timed = any(isinstance(e, Clock | Sequential) for e in elements)
        ticks = _ticks(options, default=16 if timed else 1)

        result = ResultBuilder(self.name, "timing" if ticks > 1 else "logic").timebase("tick")
        values: dict[int, Signal] = {}
        for tick in range(ticks):
            values = simulation.step(tick)
            states = {e.id: e.state() for e in elements}
            result.frame(netlist.by_net(dict(values)), states)
            if ticks > 1:
                result.sample(tick)
                for element in elements:
                    if isinstance(element, Clock | FlipFlop | Probe | LogicInput):
                        level = element.state().get("value", element.state().get("q"))
                        result.point(element.id, level, label=element.label, kind="digital")

        result.nets(netlist.by_net(dict(values)))
        for element in elements:
            result.instance(element.id, **element.state())
            if isinstance(element, Probe):
                result.summary(element.label, element.value)
        if simulation.oscillating:
            result.warn("Combinational loop did not settle; outputs may oscillate")
        return result.build()


def _ticks(options: dict[str, Any], default: int) -> int:
    try:
        requested = int(options.get("ticks") or default)
    except (TypeError, ValueError):
        requested = default
    return max(1, min(MAX_TICKS, requested))
