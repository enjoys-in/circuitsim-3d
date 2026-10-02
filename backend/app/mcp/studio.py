"""Reusable simulation facade shared by the MCP server (and any other caller).

This module contains *no* MCP-specific code. It composes the existing app
building blocks — the engine registry, :class:`SimulationService`, the seed
catalog and the agent capability probes — into small, reusable functions:

* discovery   -> :meth:`project_info`, :meth:`engine_guide`, :meth:`capabilities`
* design      -> :meth:`list_components`, :meth:`get_component`, :meth:`categories`
* build       -> :meth:`build_circuit`, :meth:`validate`
* run/output  -> :meth:`run`, :meth:`summarize`, :meth:`build_and_run`

Keeping this facade framework-agnostic means the same logic backs the MCP
server, tests and any future CLI without change.
"""
from __future__ import annotations

from typing import Any

from app.agent.capabilities import detect_native_tools, system_info
from app.core.config import get_settings
from app.core.exceptions import DomainError, ValidationError
from app.domain.entities.project import Circuit
from app.engines import build_default_registry
from app.engines.netlist import Netlist
from app.seed.catalog import CATALOG
from app.services.simulation_service import SimulationService

# Human/LLM-facing guidance for each engine. Option bounds mirror the defaults
# enforced inside the engines themselves (analog._number, mcu._option, ...).
ENGINE_GUIDE: dict[str, dict[str, Any]] = {
    "analog": {
        "title": "Analog DC & transient (SPICE-like)",
        "handles": (
            "resistors, capacitors, inductors, diodes, LEDs, BJTs, MOSFETs, "
            "power sources, regulators, buzzers and speakers"
        ),
        "needs_ground": True,
        "analyses": ["op", "tran"],
        "options": {
            "analysis": "'op' steady-state (default) or 'tran' time-domain",
            "t_stop": "transient stop time, seconds (1e-6..100, default 0.01)",
            "steps": "transient step count (10..2000, default 200)",
        },
    },
    "digital": {
        "title": "Digital logic (gates, flip-flops, clocks)",
        "handles": (
            "input, output, clock, and/or/nand/nor/xor/xnor/not/buffer/tristate, "
            "mux/demux, decoders, dff/tff/jkff, half/full adders, comparators"
        ),
        "needs_ground": False,
        "options": {
            "ticks": "number of clock ticks to simulate (default 16, max 512)",
        },
    },
    "mcu": {
        "title": "MCU firmware + mixed-signal boards",
        "handles": (
            "dev boards (esp32_devkit, ...), i2c/1-wire/uart sensors "
            "(bme280, mpu6050, dht22, ds18b20, ...), servos, displays and the "
            "analog parts a board drives"
        ),
        "needs_ground": True,
        "firmware": "set params.firmware (sandboxed Python) on the board instance",
        "options": {
            "ticks": "loop iterations (1..600, default 20)",
            "tick_ms": "milliseconds per tick (1..60000, default 500)",
        },
    },
}


class SimulationStudio:
    """Thin, reusable facade over the CircuitSim engines and catalog."""

    def __init__(self) -> None:
        self._registry = build_default_registry()
        self._sim = SimulationService(self._registry)
        self._catalog: list[dict[str, Any]] = list(CATALOG)
        self._by_key: dict[str, dict[str, Any]] = {
            str(entry["key"]): entry for entry in self._catalog
        }

    # -- discovery -----------------------------------------------------------
    def engines(self) -> list[str]:
        return self._sim.engines()

    def engine_guide(self) -> dict[str, Any]:
        return {name: ENGINE_GUIDE.get(name, {}) for name in self.engines()}

    def categories(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for entry in self._catalog:
            counts[str(entry["category"])] = counts.get(str(entry["category"]), 0) + 1
        return dict(sorted(counts.items()))

    def capabilities(self) -> dict[str, Any]:
        return {
            "system": system_info(),
            "native_tools": detect_native_tools(),
            "engines": self.engine_guide(),
        }

    def project_info(self) -> dict[str, Any]:
        settings = get_settings()
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "description": "Open-source AI electronics simulator (analog, digital, MCU).",
            "engines": self.engines(),
            "component_count": len(self._catalog),
            "categories": self.categories(),
            "features": ["design", "simulate", "analog", "digital", "mcu"],
            "system": system_info(),
            "native_tools": detect_native_tools(),
        }

    # -- catalog / design ----------------------------------------------------
    def list_components(
        self,
        *,
        category: str | None = None,
        search: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        needle = (search or "").strip().lower()
        wanted = (category or "").strip().lower()
        results: list[dict[str, Any]] = []
        for entry in self._catalog:
            if wanted and str(entry["category"]).lower() != wanted:
                continue
            if needle and needle not in self._haystack(entry):
                continue
            results.append(self._summary(entry))
            if limit is not None and len(results) >= limit:
                break
        return results

    def get_component(self, key: str) -> dict[str, Any]:
        entry = self._by_key.get(key)
        if entry is None:
            raise ValidationError(
                f"Unknown component '{key}'. Use list_components to see valid keys."
            )
        return {
            "key": entry["key"],
            "name": entry["name"],
            "category": entry["category"],
            "subcategory": entry.get("subcategory"),
            "description": entry.get("description", ""),
            "pins": [p["name"] for p in entry.get("pins", [])],
            "pin_details": entry.get("pins", []),
            "default_params": entry.get("default_params", {}),
            "tags": entry.get("tags", []),
        }

    def component_keys(self) -> list[str]:
        return sorted(self._by_key)

    # -- build ---------------------------------------------------------------
    def build_circuit(
        self,
        parts: list[dict[str, Any]],
        wires: list[Any],
    ) -> Circuit:
        """Build a :class:`Circuit` from a forgiving JSON description.

        ``parts`` items accept ``id`` plus ``type`` (or ``component_key``) and
        optional ``params``/``label``. ``wires`` items may be ``[a, b]``,
        ``{"from": a, "to": b}`` or ``{"endpoints": [a, b, ...]}`` where each
        endpoint is the string ``"<instance_id>:<pin>"``.
        """
        instances = [self._instance(i, part) for i, part in enumerate(parts)]
        known = {inst["id"] for inst in instances}
        nets = [self._net(i, wire, known) for i, wire in enumerate(wires)]
        return Circuit.model_validate({"instances": instances, "nets": nets})

    def validate(self, circuit: Circuit) -> dict[str, Any]:
        """Report design issues and the engine that would run this circuit."""
        issues: list[str] = []
        ids = {inst.id for inst in circuit.instances}
        for inst in circuit.instances:
            entry = self._by_key.get(inst.component_key)
            if entry is None:
                issues.append(f"'{inst.id}' uses unknown component '{inst.component_key}'")
                continue
            valid_pins = {p["name"] for p in entry.get("pins", [])}
            for pin in self._pins_used(circuit, inst.id):
                if valid_pins and pin not in valid_pins:
                    issues.append(
                        f"'{inst.id}' ({inst.component_key}) has no pin '{pin}'; "
                        f"valid pins: {sorted(valid_pins)}"
                    )
        for net in circuit.nets:
            for endpoint in net.endpoints:
                inst_id, _, _ = endpoint.partition(":")
                if inst_id not in ids:
                    issues.append(f"net '{net.id}' references unknown instance '{inst_id}'")

        selected: str | None = None
        selection_error: str | None = None
        try:
            selected = (
                self._registry.select(circuit).name if circuit.instances else None
            )
        except DomainError as exc:
            selection_error = str(exc)

        node_count = Netlist(circuit).node_count if circuit.nets else 0
        return {
            "ok": not issues and selection_error is None,
            "issues": issues,
            "engine": selected,
            "selection_error": selection_error,
            "instances": len(circuit.instances),
            "nets": len(circuit.nets),
            "nodes": node_count,
        }

    # -- run / output --------------------------------------------------------
    def run(
        self,
        circuit: Circuit,
        *,
        engine: str | None = None,
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        outcome = self._sim.run(circuit, engine=engine, options=options or {})
        outcome["summary_view"] = self.summarize(outcome)
        return outcome

    def build_and_run(
        self,
        parts: list[dict[str, Any]],
        wires: list[Any],
        *,
        engine: str | None = None,
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        circuit = self.build_circuit(parts, wires)
        return self.run(circuit, engine=engine, options=options)

    def verify(
        self,
        parts: list[dict[str, Any]],
        wires: list[Any],
        vectors: list[dict[str, Any]],
        *,
        engine: str | None = None,
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Build a circuit, then run each input vector and compare probe outputs."""
        circuit = self.build_circuit(parts, wires)
        return self._sim.verify(circuit, vectors, engine=engine, options=options)

    def sweep(
        self,
        parts: list[dict[str, Any]],
        wires: list[Any],
        *,
        instance: str,
        param: str,
        start: float,
        stop: float,
        steps: int = 20,
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Build a circuit, then sweep one instance parameter collecting meter readings."""
        circuit = self.build_circuit(parts, wires)
        return self._sim.sweep(
            circuit,
            instance=instance,
            param=param,
            start=start,
            stop=stop,
            steps=steps,
            options=options,
        )

    def summarize(self, outcome: dict[str, Any]) -> dict[str, Any]:
        """Condense a raw engine result into a quick, readable digest."""
        results = outcome.get("results", outcome)
        series = results.get("series", [])
        return {
            "engine": outcome.get("engine") or results.get("engine"),
            "analysis": results.get("analysis"),
            "nets": results.get("nets", {}),
            "instances": results.get("instances", {}),
            "measurements": results.get("summary", []),
            "series": [{"id": s["id"], "label": s["label"], "unit": s["unit"]} for s in series],
            "samples": len(results.get("time", [])),
            "frames": len(results.get("frames", [])),
            "log_lines": len(results.get("log", [])),
            "warnings": results.get("warnings", []),
        }

    # -- internals -----------------------------------------------------------
    @staticmethod
    def _haystack(entry: dict[str, Any]) -> str:
        tags = " ".join(str(t) for t in entry.get("tags", []))
        return " ".join(
            str(entry.get(field, ""))
            for field in ("key", "name", "subcategory", "description")
        ).lower() + " " + tags.lower()

    @staticmethod
    def _summary(entry: dict[str, Any]) -> dict[str, Any]:
        return {
            "key": entry["key"],
            "name": entry["name"],
            "category": entry["category"],
            "subcategory": entry.get("subcategory"),
            "pins": [p["name"] for p in entry.get("pins", [])],
            "default_params": entry.get("default_params", {}),
        }

    def _instance(self, index: int, part: dict[str, Any]) -> dict[str, Any]:
        key = part.get("type") or part.get("component_key")
        if not key:
            raise ValidationError(f"part #{index} is missing a 'type' (component key)")
        if key not in self._by_key:
            raise ValidationError(
                f"part #{index} uses unknown component '{key}'. "
                "Call list_components to discover valid keys."
            )
        instance_id = str(part.get("id") or f"U{index + 1}")
        params = part.get("params") or {}
        if not isinstance(params, dict):
            raise ValidationError(f"part '{instance_id}' params must be an object")
        return {
            "id": instance_id,
            "component_key": key,
            "label": str(part.get("label") or instance_id),
            "params": params,
        }

    @staticmethod
    def _net(index: int, wire: Any, known_ids: set[str]) -> dict[str, Any]:
        if isinstance(wire, dict):
            if "endpoints" in wire:
                endpoints = list(wire["endpoints"])
            else:
                endpoints = [wire.get("from"), wire.get("to")]
            net_id = str(wire.get("id") or f"w{index}")
            name = str(wire.get("name", ""))
        elif isinstance(wire, (list, tuple)):
            endpoints = list(wire)
            net_id = f"w{index}"
            name = ""
        else:
            raise ValidationError(f"wire #{index} must be a list or object of endpoints")

        clean: list[str] = []
        for endpoint in endpoints:
            if not isinstance(endpoint, str) or ":" not in endpoint:
                raise ValidationError(
                    f"wire #{index} endpoint '{endpoint}' must be '<instance_id>:<pin>'"
                )
            inst_id = endpoint.split(":", 1)[0]
            if inst_id not in known_ids:
                raise ValidationError(
                    f"wire #{index} references unknown instance '{inst_id}'"
                )
            clean.append(endpoint)
        if len(clean) < 2:
            raise ValidationError(f"wire #{index} needs at least two endpoints")
        return {"id": net_id, "name": name, "endpoints": clean}

    @staticmethod
    def _pins_used(circuit: Circuit, instance_id: str) -> set[str]:
        prefix = f"{instance_id}:"
        pins: set[str] = set()
        for net in circuit.nets:
            for endpoint in net.endpoints:
                if endpoint.startswith(prefix):
                    pins.add(endpoint[len(prefix):])
        return pins
