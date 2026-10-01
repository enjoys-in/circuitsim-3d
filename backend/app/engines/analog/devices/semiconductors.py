from __future__ import annotations

import math
from typing import Any

from app.engines.analog.devices.base import (
    THERMAL_VOLTAGE,
    Device,
    TwoTerminal,
    junction_iv,
    stamp_junction,
)
from app.engines.analog.solver import GMIN, Context, Stamper
from app.engines.analog.units import format_si

LED_FORWARD_VOLTAGE = {
    "red": 1.8,
    "yellow": 2.0,
    "orange": 2.0,
    "green": 2.1,
    "blue": 3.0,
    "white": 3.1,
}
LED_IDEALITY = 2.0
LED_REFERENCE_CURRENT = 0.01


class Diode(TwoTerminal):
    pins = ("anode", "cathode")
    nonlinear = True
    saturation = 2.5e-9
    ideality = 1.75

    def stamp(self, s: Stamper, ctx: Context) -> None:
        stamp_junction(s, self.a, self.b, self.voltage(ctx), self.saturation, self.ideality)

    def current(self, ctx: Context) -> float:
        return junction_iv(self.voltage(ctx), self.saturation, self.ideality)[0]

    def report(self, ctx: Context) -> dict[str, Any]:
        i = self.current(ctx)
        return {"voltage": self.voltage(ctx), "current": i, "on": i > 1e-4}


class Led(Diode):
    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        color = str(self.instance.params.get("color", "red")).lower()
        vf = self.p("vf", LED_FORWARD_VOLTAGE.get(color, 2.0))
        self.ideality = LED_IDEALITY
        self.saturation = LED_REFERENCE_CURRENT / math.expm1(vf / (LED_IDEALITY * THERMAL_VOLTAGE))

    def report(self, ctx: Context) -> dict[str, Any]:
        i = self.current(ctx)
        rated = self.p("max_current", 0.02)
        return {
            "voltage": self.voltage(ctx),
            "current": i,
            "on": i > 5e-4,
            "level": min(1.0, max(i, 0.0) / rated),
            "burnt": i > rated * 1.5,
        }

    def warnings(self, ctx: Context) -> list[str]:
        i = self.current(ctx)
        if i > self.p("max_current", 0.02) * 1.5:
            return [f"{self.label} overcurrent ({format_si(i, 'A')}): add a series resistor"]
        if self.voltage(ctx) < -5:
            return [f"{self.label} reverse voltage {self.voltage(ctx):.1f} V exceeds 5 V"]
        return []


class RgbLed(Device):
    """Common-cathode RGB LED: three colour junctions sharing one cathode."""

    nonlinear = True
    terminals = ("r", "g", "b", "common")
    _COLORS = (("r", "red"), ("g", "green"), ("b", "blue"))

    def _saturation(self, color: str) -> float:
        vf = LED_FORWARD_VOLTAGE[color]
        return LED_REFERENCE_CURRENT / math.expm1(vf / (LED_IDEALITY * THERMAL_VOLTAGE))

    def stamp(self, s: Stamper, ctx: Context) -> None:
        cathode = self.n("common")
        for pin, color in self._COLORS:
            anode = self.n(pin)
            stamp_junction(
                s, anode, cathode, ctx.between(anode, cathode), self._saturation(color), LED_IDEALITY
            )

    def report(self, ctx: Context) -> dict[str, Any]:
        rated = self.p("max_current", 0.02)
        cathode = self.n("common")
        channels: dict[str, float] = {}
        for pin, color in self._COLORS:
            i = junction_iv(ctx.between(self.n(pin), cathode), self._saturation(color), LED_IDEALITY)[0]
            channels[color] = round(min(1.0, max(i, 0.0) / rated), 4)
        level = max(channels.values())
        return {"channels": channels, "level": level, "on": level > 0.02}


class Zener(Diode):
    saturation = 1e-14
    ideality = 1.0

    def stamp(self, s: Stamper, ctx: Context) -> None:
        super().stamp(s, ctx)
        vz = self.p("vz", 5.1)
        stamp_junction(s, self.b, self.a, -self.voltage(ctx), 1e-14, 1.0, offset=vz)

    def current(self, ctx: Context) -> float:
        forward = super().current(ctx)
        reverse = junction_iv(-self.voltage(ctx) - self.p("vz", 5.1), 1e-14, 1.0)[0]
        return forward - reverse


class Bjt(Device):
    nonlinear = True
    terminals = ("base", "collector", "emitter")

    def __init__(self, *args: Any, npn: bool = True) -> None:
        super().__init__(*args)
        self.npn = npn
        self.saturation = self.p("is", 1e-14)
        self.beta_f = self.p("bf", 150)
        self.beta_r = self.p("br", 2)

    def _pairs(self) -> tuple[tuple[Any, Any], tuple[Any, Any], tuple[Any, Any]]:
        b, c, e = self.n("base"), self.n("collector"), self.n("emitter")
        if self.npn:
            return (b, e), (b, c), (c, e)
        return (e, b), (c, b), (e, c)

    def stamp(self, s: Stamper, ctx: Context) -> None:
        be, bc, ce = self._pairs()
        vbe, vbc = ctx.between(*be), ctx.between(*bc)
        stamp_junction(s, *be, vbe, self.saturation / self.beta_f, 1.0)
        stamp_junction(s, *bc, vbc, self.saturation / self.beta_r, 1.0)
        i_f, g_f = junction_iv(vbe, self.saturation, 1.0)
        i_r, g_r = junction_iv(vbc, self.saturation, 1.0)
        s.transconductance(*ce, *be, g_f)
        s.transconductance(*ce, *bc, -g_r)
        s.current(*ce, (i_f - i_r) - g_f * vbe + g_r * vbc)
        s.conductance(*ce, GMIN)

    def report(self, ctx: Context) -> dict[str, Any]:
        be, bc, _ = self._pairs()
        vbe, vbc = ctx.between(*be), ctx.between(*bc)
        i_f = junction_iv(vbe, self.saturation, 1.0)[0]
        i_r = junction_iv(vbc, self.saturation, 1.0)[0]
        collector = (i_f - i_r) - i_r / self.beta_r
        region = "cutoff" if vbe < 0.5 else "saturation" if vbc > 0.4 else "active"
        return {"current": collector, "vbe": vbe, "region": region, "on": region != "cutoff"}


class Mosfet(Device):
    nonlinear = True
    terminals = ("gate", "drain", "source")

    def __init__(self, *args: Any, nmos: bool = True) -> None:
        super().__init__(*args)
        self.nmos = nmos
        self.threshold = abs(self.p("vth", 2.0))
        self.k = self.p("k", 0.1 if nmos else 0.05)
        self.lam = self.p("lambda", 0.01)

    def _orient(self, ctx: Context) -> tuple[Any, Any, float, float]:
        g, d, src = self.n("gate"), self.n("drain"), self.n("source")
        sign = 1.0 if self.nmos else -1.0
        if sign * ctx.between(d, src) < 0:
            d, src = src, d
        hi, lo = (d, src) if self.nmos else (src, d)
        vgs = sign * ctx.between(g, src)
        vds = sign * ctx.between(d, src)
        return hi, lo, vgs, vds

    def _model(self, vgs: float, vds: float) -> tuple[float, float, float]:
        vov = vgs - self.threshold
        if vov <= 0:
            return 0.0, 0.0, 0.0
        clm = 1 + self.lam * vds
        if vds < vov:
            base = 2 * vov * vds - vds * vds
            return (
                self.k * base * clm,
                2 * self.k * vds * clm,
                self.k * (2 * vov - 2 * vds) * clm + self.k * base * self.lam,
            )
        return self.k * vov * vov * clm, 2 * self.k * vov * clm, self.k * vov * vov * self.lam

    def stamp(self, s: Stamper, ctx: Context) -> None:
        hi, lo, vgs, vds = self._orient(ctx)
        i, gm, gds = self._model(vgs, vds)
        gate = self.n("gate")
        gate_p, gate_n = (gate, lo) if self.nmos else (hi, gate)
        s.transconductance(hi, lo, gate_p, gate_n, gm)
        s.conductance(hi, lo, gds + GMIN)
        s.current(hi, lo, i - gm * vgs - gds * vds)

    def report(self, ctx: Context) -> dict[str, Any]:
        _, _, vgs, vds = self._orient(ctx)
        i = self._model(vgs, vds)[0]
        return {"current": i, "vgs": vgs, "on": vgs > self.threshold}
