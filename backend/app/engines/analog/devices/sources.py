from __future__ import annotations

from typing import Any

from app.domain.entities.project import ComponentInstance
from app.engines.analog.devices.base import Device, TwoTerminal
from app.engines.analog.solver import Context, Node, Stamper
from app.engines.analog.units import format_si

SHORT_CIRCUIT_CURRENT = 5.0
STIFF_CONDUCTANCE = 100.0
OFF_CONDUCTANCE = 1e-9


class VoltageSource(TwoTerminal):
    pins = ("+", "-")
    branches = 1

    def volts(self) -> float:
        return self.p("voltage", 5.0)

    @property
    def shorted(self) -> bool:
        return self.a == self.b

    def stamp(self, s: Stamper, ctx: Context) -> None:
        assert self.branch is not None
        if self.shorted:
            s.a[self.branch][self.branch] = 1.0
            return
        s.voltage_source(self.branch, self.a, self.b, self.volts())

    def supplied(self, ctx: Context) -> float:
        assert self.branch is not None
        return -ctx.x[self.branch]

    def report(self, ctx: Context) -> dict[str, Any]:
        i = self.supplied(ctx)
        return {"voltage": self.volts(), "current": i, "power": self.volts() * i}

    def warnings(self, ctx: Context) -> list[str]:
        if self.shorted:
            return [f"{self.label} terminals are wired together (dead short)"]
        i = self.supplied(ctx)
        if abs(i) > SHORT_CIRCUIT_CURRENT:
            return [f"{self.label} short circuit: {format_si(abs(i), 'A')} drawn"]
        return []


class Drive(Device):
    def __init__(self, node: Node, volts: float, resistance: float) -> None:
        super().__init__(ComponentInstance(id="drive", component_key="drive"), lambda _: None)
        self.node, self.volts, self.g = node, volts, 1.0 / resistance

    def stamp(self, s: Stamper, ctx: Context) -> None:
        s.conductance(self.node, None, self.g)
        s.current(None, self.node, self.volts * self.g)

    def sourced(self, ctx: Context) -> float:
        return (self.volts - ctx.v(self.node)) * self.g


def _norton(s: Stamper, plus: Node, minus: Node, volts: float, g: float) -> None:
    s.conductance(plus, minus, g)
    s.current(minus, plus, volts * g)


class Regulator(Device):
    nonlinear = True
    terminals = ("vin", "gnd", "vout")

    def __init__(self, *args: Any, kind: str = "ldo") -> None:
        super().__init__(*args)
        self.kind = kind
        self.on = False

    def _target(self) -> float:
        return self.p("vout", 3.3)

    def _enabled(self, vin: float) -> bool:
        vout = self._target()
        if self.kind == "ldo":
            return vin >= vout + self.p("dropout", 1.1)
        if self.kind == "buck":
            return vin >= vout + 0.5
        return vin >= 0.9

    def stamp(self, s: Stamper, ctx: Context) -> None:
        vin, gnd, vout = self.n("vin"), self.n("gnd"), self.n("vout")
        s.conductance(vin, gnd, 1e-4)
        self.on = self._enabled(ctx.between(vin, gnd))
        if self.on:
            _norton(s, vout, gnd, self._target(), STIFF_CONDUCTANCE)
        else:
            s.conductance(vout, gnd, OFF_CONDUCTANCE)

    def report(self, ctx: Context) -> dict[str, Any]:
        return {"on": self.on, "voltage": ctx.between(self.n("vout"), self.n("gnd"))}

    def warnings(self, ctx: Context) -> list[str]:
        if not self.on and abs(ctx.between(self.n("vin"), self.n("gnd"))) > 0.1:
            return [f"{self.label} input too low to regulate {self._target():.1f} V"]
        return []


class Charger(Device):
    nonlinear = True
    terminals = ("in+", "in-", "bat+", "bat-")
    charge_voltage = 4.2
    charge_conductance = 1.0

    def stamp(self, s: Stamper, ctx: Context) -> None:
        s.conductance(self.n("in+"), self.n("in-"), 1e-3)
        if self._powered(ctx):
            _norton(s, self.n("bat+"), self.n("bat-"), self.charge_voltage, self.charge_conductance)
        else:
            s.conductance(self.n("bat+"), self.n("bat-"), OFF_CONDUCTANCE)

    def _powered(self, ctx: Context) -> bool:
        return ctx.between(self.n("in+"), self.n("in-")) >= 4.5

    def report(self, ctx: Context) -> dict[str, Any]:
        vbat = ctx.between(self.n("bat+"), self.n("bat-"))
        current = (
            (self.charge_voltage - vbat) * self.charge_conductance if self._powered(ctx) else 0.0
        )
        return {"on": current > 0.01, "current": current, "voltage": vbat}


class Bms(Device):
    nonlinear = True
    terminals = ("b+", "b-", "p+", "p-")

    def _cell_ok(self, ctx: Context) -> bool:
        cell = ctx.between(self.n("b+"), self.n("b-"))
        return 2.5 <= cell <= 4.3

    def stamp(self, s: Stamper, ctx: Context) -> None:
        g = 20.0 if self._cell_ok(ctx) else OFF_CONDUCTANCE
        s.conductance(self.n("b+"), self.n("p+"), g)
        s.conductance(self.n("b-"), self.n("p-"), g)

    def report(self, ctx: Context) -> dict[str, Any]:
        return {"on": self._cell_ok(ctx), "voltage": ctx.between(self.n("b+"), self.n("b-"))}


class ShuntMonitor(Device):
    shunt = 0.1
    terminals = ("vin+", "vin-")

    def stamp(self, s: Stamper, ctx: Context) -> None:
        s.conductance(self.n("vin+"), self.n("vin-"), 1.0 / self.shunt)

    def report(self, ctx: Context) -> dict[str, Any]:
        current = ctx.between(self.n("vin+"), self.n("vin-")) / self.shunt
        bus = ctx.v(self.n("vin-"))
        return {
            "current": current,
            "voltage": bus,
            "readings": {
                "current": round(current, 5),
                "bus_voltage": round(bus, 4),
                "power": round(current * bus, 5),
            },
        }
