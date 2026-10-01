from __future__ import annotations

import math
from collections.abc import Callable
from typing import Any

from app.domain.entities.project import ComponentInstance
from app.engines.analog.solver import GMIN, Context, Node, Stamper
from app.engines.analog.units import param

THERMAL_VOLTAGE = 0.025852
JUNCTION_CURRENT_CAP = 10.0


def junction_iv(v: float, saturation: float, ideality: float) -> tuple[float, float]:
    nvt = ideality * THERMAL_VOLTAGE
    critical = nvt * math.log(JUNCTION_CURRENT_CAP / saturation)
    if v > critical:
        e = math.exp(critical / nvt)
        return saturation * (e * (1 + (v - critical) / nvt) - 1), saturation * e / nvt
    e = math.exp(max(v, -40 * nvt) / nvt)
    return saturation * (e - 1), saturation * e / nvt


def stamp_junction(
    s: Stamper,
    a: Node,
    b: Node,
    v0: float,
    saturation: float,
    ideality: float,
    offset: float = 0.0,
) -> float:
    i, g = junction_iv(v0 - offset, saturation, ideality)
    g += GMIN
    s.conductance(a, b, g)
    s.current(a, b, i - g * v0)
    return i


Resolver = Callable[[str], Node]


class Device:
    branches = 0
    nonlinear = False
    terminals: tuple[str, ...] = ()

    def __init__(self, instance: ComponentInstance, resolve: Resolver) -> None:
        self.instance = instance
        self.nodes: dict[str, Node] = {pin: resolve(pin) for pin in self.terminals}
        self.branch: int | None = None

    @property
    def id(self) -> str:
        return self.instance.id

    @property
    def label(self) -> str:
        return self.instance.label or self.instance.id

    def n(self, pin: str) -> Node:
        return self.nodes.get(pin)

    def p(self, key: str, default: float) -> float:
        return param(self.instance.params, key, default)

    def stamp(self, s: Stamper, ctx: Context) -> None:
        raise NotImplementedError

    def accept(self, ctx: Context) -> None:
        return None

    def report(self, ctx: Context) -> dict[str, Any]:
        return {}

    def warnings(self, ctx: Context) -> list[str]:
        return []


class TwoTerminal(Device):
    pins: tuple[str, str] = ("a", "b")

    @property
    def terminals(self) -> tuple[str, ...]:  # type: ignore[override]
        return self.pins

    @property
    def a(self) -> Node:
        return self.n(self.pins[0])

    @property
    def b(self) -> Node:
        return self.n(self.pins[1])

    def voltage(self, ctx: Context) -> float:
        return ctx.between(self.a, self.b)
