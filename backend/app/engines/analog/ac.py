"""Small-signal AC analysis: complex-MNA frequency sweep for a Bode plot.

Reuses the netlist's node merging but solves a complex linear system per frequency
with frequency-dependent impedances (Z_C = 1/(jwC), Z_L = jwL). Every voltage source
is driven with a unit (1 V) AC stimulus so each probe reports a transfer function.
"""
from __future__ import annotations

import cmath
import math

from app.core.exceptions import ValidationError
from app.domain.entities.project import Circuit
from app.engines.analog.units import parse_si
from app.engines.netlist import Netlist, split_endpoint

# component key -> (pin_a, pin_b, value param, default value)
_IMPEDANCE: dict[str, tuple[str, str, str, float]] = {
    "resistor": ("a", "b", "resistance", 1000.0),
    "capacitor": ("a", "b", "capacitance", 1e-7),
    "electrolytic_cap": ("+", "-", "capacitance", 1e-5),
    "inductor": ("a", "b", "inductance", 1e-5),
}
_SOURCES: dict[str, tuple[str, str]] = {
    "dc_supply": ("+", "-"),
    "battery_lipo": ("+", "-"),
}
_GROUND_KEYS = {"ground"}


def _complex_solve(matrix: list[list[complex]], rhs: list[complex]) -> list[complex]:
    size = len(rhs)
    a = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(size):
        pivot = max(range(col, size), key=lambda r: abs(a[r][col]))
        if abs(a[pivot][col]) < 1e-18:
            raise ValidationError(
                "AC analysis could not solve the circuit (check for floating nodes)"
            )
        a[col], a[pivot] = a[pivot], a[col]
        head = a[col]
        for row in range(col + 1, size):
            factor = a[row][col] / head[col]
            if factor:
                target = a[row]
                for k in range(col, size + 1):
                    target[k] -= factor * head[k]
    x: list[complex] = [0j] * size
    for row in range(size - 1, -1, -1):
        total = a[row][size] - sum(a[row][k] * x[k] for k in range(row + 1, size))
        x[row] = total / a[row][row]
    return x


def _logspace(start: float, stop: float, points: int) -> list[float]:
    start = max(start, 1e-3)
    stop = max(stop, start * 10)
    points = max(2, min(points, 400))
    lo, hi = math.log10(start), math.log10(stop)
    return [10 ** (lo + (hi - lo) * i / (points - 1)) for i in range(points)]


def _node_label(net: Netlist, labels: dict[str, str], node: int) -> str:
    names = [
        f"{labels.get(iid, iid)}.{pin}"
        for iid, pin in (split_endpoint(ep) for ep in net.endpoints(node))
    ]
    return min(names) if names else f"node{node}"


def ac_sweep(circuit: Circuit, start_hz: float, stop_hz: float, points: int) -> dict[str, object]:
    net = Netlist(circuit)
    labels = {i.id: (i.label or i.id) for i in circuit.instances}

    ground: set[int] = set()
    for inst in circuit.instances:
        if inst.component_key in _GROUND_KEYS:
            node = net.node(inst.id, "gnd")
            if node is not None:
                ground.add(node)

    index: dict[int, int] = {}
    for node in range(net.node_count):
        if node not in ground:
            index[node] = len(index)
    n = len(index)

    elements: list[tuple[str, int | None, int | None, float]] = []
    for inst in circuit.instances:
        spec = _IMPEDANCE.get(inst.component_key)
        if not spec:
            continue
        pin_a, pin_b, key, default = spec
        na, nb = net.node(inst.id, pin_a), net.node(inst.id, pin_b)
        if na is None or nb is None:
            continue
        value = parse_si(inst.params.get(key, default), default)
        elements.append((inst.component_key, index.get(na), index.get(nb), value))

    sources: list[tuple[int | None, int | None]] = []
    for inst in circuit.instances:
        pins = _SOURCES.get(inst.component_key)
        if not pins:
            continue
        na, nb = net.node(inst.id, pins[0]), net.node(inst.id, pins[1])
        if na is None or nb is None:
            continue
        sources.append((index.get(na), index.get(nb)))

    if not sources:
        raise ValidationError(
            "AC analysis needs a voltage source (DC supply / battery) to drive the circuit"
        )

    size = n + len(sources)

    probes: list[tuple[str, str, int | None, int | None]] = []
    for inst in circuit.instances:
        if inst.component_key == "voltmeter":
            na, nb = net.node(inst.id, "+"), net.node(inst.id, "-")
            if na is not None:
                probes.append((inst.id, inst.label or inst.id, index.get(na), index.get(nb)))
    if not probes:
        for node, idx in index.items():
            probes.append((f"node{node}", _node_label(net, labels, node), idx, None))

    freqs = _logspace(start_hz, stop_hz, points)
    mags: dict[str, list[float]] = {p[0]: [] for p in probes}
    phases: dict[str, list[float]] = {p[0]: [] for p in probes}

    for freq in freqs:
        w = 2 * math.pi * freq
        a: list[list[complex]] = [[0j] * size for _ in range(size)]
        z: list[complex] = [0j] * size
        for i in range(n):
            a[i][i] += 1e-12
        for kind, ia, ib, value in elements:
            if kind == "resistor":
                y = 1.0 / max(value, 1e-9)
            elif kind in ("capacitor", "electrolytic_cap"):
                y = 1j * w * value
            else:  # inductor
                y = 1.0 / (1j * w * value) if value > 0 else 1e12
            _stamp(a, ia, ib, y)
        for k, (ia, ib) in enumerate(sources):
            branch = n + k
            if ia is not None:
                a[ia][branch] += 1
                a[branch][ia] += 1
            if ib is not None:
                a[ib][branch] -= 1
                a[branch][ib] -= 1
            z[branch] = 1.0
        x = _complex_solve(a, z)
        for pid, _label, pi, mi in probes:
            vp = x[pi] if pi is not None else 0j
            vm = x[mi] if mi is not None else 0j
            v = vp - vm
            mag = abs(v)
            mags[pid].append(20 * math.log10(mag) if mag > 1e-15 else -300.0)
            phases[pid].append(math.degrees(cmath.phase(v)))

    series = [
        {"id": pid, "label": label, "magnitude_db": mags[pid], "phase_deg": phases[pid]}
        for pid, label, _pi, _mi in probes
    ]
    return {"freqs": freqs, "series": series}


def _stamp(a: list[list[complex]], ia: int | None, ib: int | None, y: complex) -> None:
    if ia is not None:
        a[ia][ia] += y
    if ib is not None:
        a[ib][ib] += y
    if ia is not None and ib is not None:
        a[ia][ib] -= y
        a[ib][ia] -= y
