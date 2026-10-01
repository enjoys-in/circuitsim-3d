from __future__ import annotations

from typing import Any

from app.engines.analog.devices.base import Device, TwoTerminal
from app.engines.analog.solver import GMIN, Context, Stamper
from app.engines.analog.units import format_si

OPEN_CONDUCTANCE = 1e-9
CLOSED_RESISTANCE = 0.01
DC_INDUCTOR_CONDUCTANCE = 1e4


class Resistive(TwoTerminal):
    def resistance(self) -> float:
        raise NotImplementedError

    def conductance(self) -> float:
        return 1.0 / max(self.resistance(), 1e-6)

    def stamp(self, s: Stamper, ctx: Context) -> None:
        s.conductance(self.a, self.b, self.conductance())

    def current(self, ctx: Context) -> float:
        return self.voltage(ctx) * self.conductance()

    def report(self, ctx: Context) -> dict[str, Any]:
        v, i = self.voltage(ctx), self.current(ctx)
        return {"voltage": v, "current": i, "power": abs(v * i)}


class Resistor(Resistive):
    def resistance(self) -> float:
        return self.p("resistance", 1000)

    def warnings(self, ctx: Context) -> list[str]:
        rating = self.p("power_rating", 0.25)
        power = abs(self.voltage(ctx) * self.current(ctx))
        if power > rating:
            return [
                f"{self.label} dissipates {format_si(power, 'W')} (rated {format_si(rating, 'W')})"
            ]
        return []


class Ldr(Resistive):
    def resistance(self) -> float:
        lux = max(self.p("lux", 100), 0.01)
        resistance: float = 20_000 * float(lux / 10) ** -0.7
        return min(max(resistance, 100.0), 10e6)

    def report(self, ctx: Context) -> dict[str, Any]:
        return {**super().report(ctx), "resistance": self.resistance()}


class Switch(Resistive):
    def closed(self) -> bool:
        on = bool(self.p("pressed", 0) or self.p("closed", 0))
        return on != bool(self.p("normally_closed", 0))

    def resistance(self) -> float:
        return CLOSED_RESISTANCE if self.closed() else 1.0 / OPEN_CONDUCTANCE

    def report(self, ctx: Context) -> dict[str, Any]:
        return {**super().report(ctx), "on": self.closed()}


class Fan(Resistive):
    pins = ("+", "-")

    def resistance(self) -> float:
        return self.p("resistance", 60)

    def report(self, ctx: Context) -> dict[str, Any]:
        i = self.current(ctx)
        rated = self.p("rated_current", 0.08)
        return {
            **super().report(ctx),
            "on": i > rated * 0.3,
            "level": min(1.0, max(i, 0.0) / rated),
        }


class Buzzer(Resistive):
    pins = ("+", "-")

    def resistance(self) -> float:
        return self.p("resistance", 40)

    def report(self, ctx: Context) -> dict[str, Any]:
        return {**super().report(ctx), "on": self.voltage(ctx) > 1.5}


class Speaker(Resistive):
    pins = ("+", "-")

    def resistance(self) -> float:
        return self.p("resistance", 32)

    def report(self, ctx: Context) -> dict[str, Any]:
        return {**super().report(ctx), "on": abs(self.voltage(ctx)) > 0.3}


class Relay(Device):
    """SPDT relay: a coil that closes COM->NO (and opens COM->NC) when energized."""

    nonlinear = True
    terminals = ("coil+", "coil-", "com", "no", "nc")

    def coil_voltage(self, ctx: Context) -> float:
        return abs(ctx.between(self.n("coil+"), self.n("coil-")))

    def energized(self, ctx: Context) -> bool:
        return self.coil_voltage(ctx) >= self.p("pull_in", 2.5)

    def stamp(self, s: Stamper, ctx: Context) -> None:
        s.conductance(
            self.n("coil+"), self.n("coil-"), 1.0 / max(self.p("coil_resistance", 120), 1.0)
        )
        on = self.energized(ctx)
        closed, opened = 1.0 / CLOSED_RESISTANCE, OPEN_CONDUCTANCE
        s.conductance(self.n("com"), self.n("no"), closed if on else opened)
        s.conductance(self.n("com"), self.n("nc"), opened if on else closed)

    def report(self, ctx: Context) -> dict[str, Any]:
        return {"on": self.energized(ctx), "coil_voltage": self.coil_voltage(ctx)}


class Potentiometer(TwoTerminal):
    pins = ("1", "3")

    @property
    def terminals(self) -> tuple[str, ...]:  # type: ignore[override]
        return ("1", "wiper", "3")

    def _halves(self) -> tuple[float, float]:
        total = self.p("resistance", 10_000)
        position = min(max(self.p("position", 0.5), 0.0), 1.0)
        return max(total * position, 1.0), max(total * (1 - position), 1.0)

    def stamp(self, s: Stamper, ctx: Context) -> None:
        upper, lower = self._halves()
        s.conductance(self.n("1"), self.n("wiper"), 1.0 / upper)
        s.conductance(self.n("wiper"), self.n("3"), 1.0 / lower)

    def report(self, ctx: Context) -> dict[str, Any]:
        return {"voltage": ctx.between(self.n("wiper"), self.n("1"))}


class Capacitor(TwoTerminal):
    def __init__(self, *args: Any, polarity: tuple[str, str] = ("a", "b")) -> None:
        self.pins = polarity
        super().__init__(*args)
        self._v_prev = 0.0
        self._i = 0.0

    def _g(self, ctx: Context) -> float:
        return self.p("capacitance", 1e-7) / ctx.dt

    def stamp(self, s: Stamper, ctx: Context) -> None:
        if ctx.mode != "tran":
            s.conductance(self.a, self.b, GMIN)
            return
        g = self._g(ctx)
        s.conductance(self.a, self.b, g)
        s.current(self.a, self.b, -g * self._v_prev)

    def accept(self, ctx: Context) -> None:
        v = self.voltage(ctx)
        self._i = self._g(ctx) * (v - self._v_prev) if ctx.mode == "tran" else 0.0
        self._v_prev = v

    def report(self, ctx: Context) -> dict[str, Any]:
        return {"voltage": self.voltage(ctx), "current": self._i}

    def warnings(self, ctx: Context) -> list[str]:
        if self.pins == ("+", "-") and self.voltage(ctx) < -0.5:
            return [f"{self.label} is reverse biased (electrolytic polarity)"]
        return []


class Inductor(TwoTerminal):
    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self._i_prev = 0.0

    def _g(self, ctx: Context) -> float:
        if ctx.mode != "tran":
            return DC_INDUCTOR_CONDUCTANCE
        return ctx.dt / self.p("inductance", 1e-5)

    def stamp(self, s: Stamper, ctx: Context) -> None:
        s.conductance(self.a, self.b, self._g(ctx))
        if ctx.mode == "tran":
            s.current(self.a, self.b, self._i_prev)

    def _current(self, ctx: Context) -> float:
        base = self._i_prev if ctx.mode == "tran" else 0.0
        return self._g(ctx) * self.voltage(ctx) + base

    def accept(self, ctx: Context) -> None:
        self._i_prev = self._current(ctx)

    def report(self, ctx: Context) -> dict[str, Any]:
        return {"voltage": self.voltage(ctx), "current": self._i_prev}
