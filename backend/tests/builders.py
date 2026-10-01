from __future__ import annotations

from app.domain.entities.project import Circuit

Part = tuple[str, str, dict[str, object]]


def circuit(parts: list[Part], wires: list[tuple[str, str]]) -> Circuit:
    return Circuit.model_validate(
        {
            "instances": [
                {"id": pid, "component_key": key, "label": pid, "params": params}
                for pid, key, params in parts
            ],
            "nets": [{"id": f"w{i}", "endpoints": [a, b]} for i, (a, b) in enumerate(wires)],
        }
    )
