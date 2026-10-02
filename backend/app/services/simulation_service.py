"""Business logic for running simulations."""
from __future__ import annotations

from app.domain.entities.project import Circuit
from app.engines.registry import EngineRegistry

_INPUT_KEYS = {"input"}
_OUTPUT_KEYS = {"output", "led"}

# Which scalar each meter-like part contributes to a sweep, and its unit.
_METER_READING: dict[str, tuple[str, str]] = {
    "voltmeter": ("voltage", "V"),
    "ammeter": ("current", "A"),
    "led": ("current", "A"),
    "output": ("value", ""),
}

_PARAM_UNIT: dict[str, str] = {
    "voltage": "V",
    "vout": "V",
    "resistance": "Ω",
    "capacitance": "F",
    "inductance": "H",
    "current": "A",
    "position": "",
}


def _to_bit(value: object) -> int | None:
    if value is None:
        return None
    try:
        return 1 if int(value) else 0  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 1 if value else 0


def _number(value: object) -> float | None:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


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

    def verify(
        self,
        circuit: Circuit,
        vectors: list[dict[str, object]],
        *,
        engine: str | None = None,
        options: dict[str, object] | None = None,
    ) -> dict[str, object]:
        """Run the circuit once per input vector and compare probe outputs to expectations."""
        input_parts = [i for i in circuit.instances if i.component_key in _INPUT_KEYS]
        output_parts = [i for i in circuit.instances if i.component_key in _OUTPUT_KEYS]
        opts = options or {}
        rows: list[dict[str, object]] = []
        engine_name = engine or ""
        passed = failed = 0
        for vector in vectors:
            assignments = dict(vector.get("inputs") or {})  # type: ignore[arg-type]
            expected = vector.get("expected") or None
            trial = circuit.model_copy(deep=True)
            for inst in trial.instances:
                if inst.id in assignments:
                    inst.params = {**inst.params, "value": 1 if assignments[inst.id] else 0}
            selected = self._registry.get(engine) if engine else self._registry.select(trial)
            engine_name = selected.name
            result = selected.run(trial, opts)
            states = result.get("instances", {}) if isinstance(result, dict) else {}
            outputs = {
                part.id: _to_bit((states.get(part.id) or {}).get("value"))
                for part in output_parts
            }
            row_passed: bool | None = None
            if expected:
                row_passed = all(
                    outputs.get(pin) == (1 if want else 0) for pin, want in expected.items()
                )
                passed += 1 if row_passed else 0
                failed += 0 if row_passed else 1
            rows.append(
                {
                    "inputs": assignments,
                    "outputs": outputs,
                    "expected": expected,
                    "passed": row_passed,
                }
            )
        return {
            "engine": engine_name,
            "inputs": [{"id": i.id, "label": i.label or i.id} for i in input_parts],
            "outputs": [{"id": o.id, "label": o.label or o.id} for o in output_parts],
            "rows": rows,
            "passed": passed,
            "failed": failed,
            "total": len(rows),
        }

    def sweep(
        self,
        circuit: Circuit,
        *,
        instance: str,
        param: str,
        start: float,
        stop: float,
        steps: int = 20,
        options: dict[str, object] | None = None,
    ) -> dict[str, object]:
        """Sweep one instance parameter across a range, collecting meter readings per point."""
        steps = max(2, min(200, int(steps)))
        xs = [start + (stop - start) * i / (steps - 1) for i in range(steps)]
        meters = [
            (m.id, m.label or m.id, *_METER_READING[m.component_key])
            for m in circuit.instances
            if m.component_key in _METER_READING
        ]
        series: dict[str, dict[str, object]] = {
            mid: {"id": mid, "label": label, "unit": unit, "values": []}
            for mid, label, _field, unit in meters
        }
        opts = {**(options or {})}
        opts.pop("analysis", None)  # DC operating point at each swept value
        engine_name = ""
        for x in xs:
            trial = circuit.model_copy(deep=True)
            for inst in trial.instances:
                if inst.id == instance:
                    inst.params = {**inst.params, param: x}
            try:
                selected = self._registry.select(trial)
                engine_name = selected.name
                result = selected.run(trial, opts)
                states = result.get("instances", {}) if isinstance(result, dict) else {}
            except Exception:  # noqa: BLE001 - one bad point must not abort the sweep
                states = {}
            for mid, _label, field, _unit in meters:
                series[mid]["values"].append(  # type: ignore[union-attr]
                    _number((states.get(mid) or {}).get(field))
                )
        return {
            "engine": engine_name,
            "x": xs,
            "x_label": f"{instance}.{param}",
            "x_unit": _PARAM_UNIT.get(param, ""),
            "series": list(series.values()),
        }
