from __future__ import annotations

from collections.abc import Callable
from typing import Any

from app.domain.entities.project import ComponentInstance

Signal = int | None
Pins = dict[str, Signal]


def _bit(value: object) -> int:
    try:
        return 1 if int(float(str(value))) else 0
    except ValueError:
        return 0


class LogicElement:
    inputs: tuple[str, ...] = ()
    outputs: tuple[str, ...] = ()

    def __init__(self, instance: ComponentInstance) -> None:
        self.instance = instance

    @property
    def id(self) -> str:
        return self.instance.id

    @property
    def label(self) -> str:
        return self.instance.label or self.instance.id

    def drive(self, tick: int) -> Pins:
        return {}

    def evaluate(self, pins: Pins) -> Pins:
        return {}

    def observe(self, pins: Pins) -> None:
        return None

    def state(self) -> dict[str, Any]:
        return {}

    @property
    def combinational(self) -> bool:
        return bool(self.inputs) and bool(self.outputs)


class Gate(LogicElement):
    outputs = ("out",)

    def __init__(
        self,
        instance: ComponentInstance,
        inputs: tuple[str, ...],
        fn: Callable[[list[int]], int],
    ) -> None:
        super().__init__(instance)
        self.inputs = inputs
        self._fn = fn

    def evaluate(self, pins: Pins) -> Pins:
        values = [pins.get(p) for p in self.inputs]
        if any(v is None for v in values):
            return {"out": None}
        return {"out": self._fn([int(v) for v in values if v is not None])}


class Mux2(LogicElement):
    inputs = ("a", "b", "sel")
    outputs = ("out",)

    def evaluate(self, pins: Pins) -> Pins:
        sel = pins.get("sel")
        if sel is None:
            return {"out": None}
        return {"out": pins.get("b") if sel else pins.get("a")}


class LogicInput(LogicElement):
    outputs = ("out",)

    def drive(self, tick: int) -> Pins:
        return {"out": _bit(self.instance.params.get("value", 0))}

    def state(self) -> dict[str, Any]:
        return {"value": _bit(self.instance.params.get("value", 0))}


class Clock(LogicElement):
    outputs = ("out",)

    def __init__(self, instance: ComponentInstance) -> None:
        super().__init__(instance)
        self._period = max(2, int(float(str(instance.params.get("period", 2)))))
        self._value = 0

    def drive(self, tick: int) -> Pins:
        self._value = 1 if tick % self._period >= self._period // 2 else 0
        return {"out": self._value}

    def state(self) -> dict[str, Any]:
        return {"value": self._value, "on": bool(self._value)}


class Probe(LogicElement):
    def __init__(self, instance: ComponentInstance, pin: str) -> None:
        super().__init__(instance)
        self.inputs = (pin,)
        self._pin = pin
        self.value: Signal = None

    def observe(self, pins: Pins) -> None:
        self.value = pins.get(self._pin)

    def state(self) -> dict[str, Any]:
        return {"value": self.value, "on": self.value == 1}


class Rail(LogicElement):
    """A power rail as a constant logic level: VCC pins drive 1, ground pins drive 0."""

    def __init__(self, instance: ComponentInstance, levels: dict[str, int]) -> None:
        super().__init__(instance)
        self._levels = levels

    def drive(self, tick: int) -> Pins:
        return dict(self._levels)

    def state(self) -> dict[str, Any]:
        high = max(self._levels.values(), default=0)
        return {"value": high, "on": bool(high)}


class Sequential(LogicElement):
    @property
    def combinational(self) -> bool:
        return False

    def rising(self, pins: Pins) -> bool:
        return False

    def next_state(self, pins: Pins) -> Any:
        return None

    def apply(self, value: Any) -> None:
        return None

    def remember(self, pins: Pins) -> None:
        return None


class FlipFlop(Sequential):
    outputs = ("q", "qn")

    def __init__(self, instance: ComponentInstance) -> None:
        super().__init__(instance)
        self.q = _bit(instance.params.get("initial", 0))
        self._last_clk: Signal = None

    def drive(self, tick: int) -> Pins:
        return {"q": self.q, "qn": 1 - self.q}

    def rising(self, pins: Pins) -> bool:
        return self._last_clk == 0 and pins.get("clk") == 1

    def remember(self, pins: Pins) -> None:
        self._last_clk = pins.get("clk")

    def next_state(self, pins: Pins) -> int:
        raise NotImplementedError

    def apply(self, value: Any) -> None:
        self.q = int(value)

    def state(self) -> dict[str, Any]:
        return {"q": self.q, "on": bool(self.q)}


class DFlipFlop(FlipFlop):
    inputs = ("d", "clk")

    def next_state(self, pins: Pins) -> int:
        return int(pins.get("d") or 0)


class TFlipFlop(FlipFlop):
    inputs = ("t", "clk")

    def next_state(self, pins: Pins) -> int:
        return 1 - self.q if pins.get("t") else self.q


class JKFlipFlop(FlipFlop):
    inputs = ("j", "k", "clk")

    def next_state(self, pins: Pins) -> int:
        j, k = bool(pins.get("j")), bool(pins.get("k"))
        if j and k:
            return 1 - self.q
        if j:
            return 1
        if k:
            return 0
        return self.q


class SRFlipFlop(FlipFlop):
    inputs = ("s", "r", "clk")

    def next_state(self, pins: Pins) -> int:
        s, r = bool(pins.get("s")), bool(pins.get("r"))
        if s and not r:
            return 1
        if r and not s:
            return 0
        return self.q


class _Word(Sequential):
    """Clock-edge triggered multi-bit register base."""

    def __init__(self, instance: ComponentInstance, width: int) -> None:
        super().__init__(instance)
        self._width = width
        self.outputs = tuple(f"q{i}" for i in range(width))
        self._bits = 0
        self._last_clk: Signal = None

    def drive(self, tick: int) -> Pins:
        return {f"q{i}": (self._bits >> i) & 1 for i in range(self._width)}

    def rising(self, pins: Pins) -> bool:
        return self._last_clk == 0 and pins.get("clk") == 1

    def remember(self, pins: Pins) -> None:
        self._last_clk = pins.get("clk")

    def apply(self, value: Any) -> None:
        self._bits = int(value)

    def state(self) -> dict[str, Any]:
        return {"value": self._bits, "on": bool(self._bits)}


class Counter(_Word):
    inputs = ("clk", "reset")

    def next_state(self, pins: Pins) -> int:
        if pins.get("reset"):
            return 0
        return (self._bits + 1) % (1 << self._width)


class ShiftRegister(_Word):
    inputs = ("clk", "data")

    def next_state(self, pins: Pins) -> int:
        bit = 1 if pins.get("data") else 0
        return ((self._bits << 1) | bit) & ((1 << self._width) - 1)


class Register(_Word):
    def __init__(self, instance: ComponentInstance, width: int) -> None:
        super().__init__(instance, width)
        self.inputs = ("clk", "en", *(f"d{i}" for i in range(width)))

    def next_state(self, pins: Pins) -> int:
        if pins.get("en") == 0:
            return self._bits
        value = 0
        for i in range(self._width):
            if pins.get(f"d{i}"):
                value |= 1 << i
        return value


class Combinational(LogicElement):
    def __init__(
        self,
        instance: ComponentInstance,
        inputs: tuple[str, ...],
        outputs: tuple[str, ...],
        fn: Callable[[dict[str, int]], Pins],
    ) -> None:
        super().__init__(instance)
        self.inputs = inputs
        self.outputs = outputs
        self._fn = fn
        self._last: Pins = {}

    def evaluate(self, pins: Pins) -> Pins:
        values = {p: pins.get(p) for p in self.inputs}
        if any(v is None for v in values.values()):
            self._last = dict.fromkeys(self.outputs)
        else:
            self._last = self._fn({p: int(v) for p, v in values.items()})
        return self._last

    def state(self) -> dict[str, Any]:
        return dict(self._last)


def _word(pins: Pins, names: tuple[str, ...]) -> int | None:
    bits = [pins.get(n) for n in names]
    if any(v is None for v in bits):
        return None
    return sum(int(v) << i for i, v in enumerate(bits))


class Alu(LogicElement):
    """Combinational ALU: op selects add/sub/and/or/xor/not/shl/shr."""

    def __init__(self, instance: ComponentInstance, width: int = 4) -> None:
        super().__init__(instance)
        self._w = width
        self._mask = (1 << width) - 1
        self._a = tuple(f"a{i}" for i in range(width))
        self._b = tuple(f"b{i}" for i in range(width))
        self.inputs = (*self._a, *self._b, "op0", "op1", "op2", "cin")
        self.outputs = (*(f"y{i}" for i in range(width)), "cout", "zero")
        self._last: Pins = {}

    def evaluate(self, pins: Pins) -> Pins:
        a = _word(pins, self._a)
        b = _word(pins, self._b)
        op = _word(pins, ("op0", "op1", "op2"))
        if a is None or b is None or op is None:
            self._last = dict.fromkeys(self.outputs)
            return self._last
        result, cout = self._compute(op, a, b, 1 if pins.get("cin") else 0)
        result &= self._mask
        self._last = {f"y{i}": (result >> i) & 1 for i in range(self._w)}
        self._last["cout"] = cout
        self._last["zero"] = int(result == 0)
        return self._last

    def _compute(self, op: int, a: int, b: int, cin: int) -> tuple[int, int]:
        if op == 0:
            total = a + b + cin
            return total, (total >> self._w) & 1
        if op == 1:
            return a - b, int(a < b)
        if op == 2:
            return a & b, 0
        if op == 3:
            return a | b, 0
        if op == 4:
            return a ^ b, 0
        if op == 5:
            return ~a, 0
        if op == 6:
            shifted = a << 1
            return shifted, (shifted >> self._w) & 1
        return a >> 1, a & 1

    def state(self) -> dict[str, Any]:
        value = sum(int(self._last.get(f"y{i}") or 0) << i for i in range(self._w))
        return {"value": value}


class Rom(LogicElement):
    """Combinational ROM addressed by a bits, contents from params['data']."""

    def __init__(self, instance: ComponentInstance, addr: int = 4, data: int = 4) -> None:
        super().__init__(instance)
        self._dw = data
        self.inputs = tuple(f"a{i}" for i in range(addr))
        self.outputs = tuple(f"d{i}" for i in range(data))
        contents = instance.params.get("data", [])
        self._rom = [int(x) for x in contents] if isinstance(contents, list) else []
        self._last: Pins = {}

    def evaluate(self, pins: Pins) -> Pins:
        addr = _word(pins, self.inputs)
        if addr is None:
            self._last = dict.fromkeys(self.outputs)
            return self._last
        word = self._rom[addr] if 0 <= addr < len(self._rom) else 0
        self._last = {f"d{i}": (word >> i) & 1 for i in range(self._dw)}
        return self._last

    def state(self) -> dict[str, Any]:
        return {"words": len(self._rom)}


class Ram(Sequential):
    """16-word RAM: writes on the clock edge when WE is high, reads async."""

    def __init__(self, instance: ComponentInstance, addr: int = 4, data: int = 4) -> None:
        super().__init__(instance)
        self._dw = data
        self._addr = tuple(f"a{i}" for i in range(addr))
        self._din = tuple(f"d{i}" for i in range(data))
        self.inputs = (*self._addr, *self._din, "we", "clk")
        self.outputs = tuple(f"q{i}" for i in range(data))
        self._mem = [0] * (1 << addr)
        self._last_clk: Signal = None
        self._last: Pins = {}

    @property
    def combinational(self) -> bool:
        return True

    def evaluate(self, pins: Pins) -> Pins:
        addr = _word(pins, self._addr)
        if addr is None:
            self._last = dict.fromkeys(self.outputs)
            return self._last
        word = self._mem[addr]
        self._last = {f"q{i}": (word >> i) & 1 for i in range(self._dw)}
        return self._last

    def rising(self, pins: Pins) -> bool:
        return self._last_clk == 0 and pins.get("clk") == 1

    def remember(self, pins: Pins) -> None:
        self._last_clk = pins.get("clk")

    def next_state(self, pins: Pins) -> tuple[int, int] | None:
        if not pins.get("we"):
            return None
        addr = _word(pins, self._addr)
        din = _word(pins, self._din)
        if addr is None or din is None:
            return None
        return (addr, din)

    def apply(self, value: Any) -> None:
        if value is not None:
            addr, din = value
            self._mem[addr] = din

    def state(self) -> dict[str, Any]:
        return {"words": len(self._mem)}


class Cpu(Sequential):
    """A self-contained accumulator computer: each step fetches one program byte
    (high nibble = opcode, low nibble = operand) and updates the accumulator.
    ops: 0 ADD, 1 SUB, 2 AND, 3 OR, 4 XOR, 5 LOAD, 6 SHL, 7 HALT. Runs on a wired
    clock, or free-runs one instruction per tick when `clk` is left unwired."""

    def __init__(self, instance: ComponentInstance, width: int = 4, slots: int = 16) -> None:
        super().__init__(instance)
        self._w = width
        self._mask = (1 << width) - 1
        self._slots = slots
        self.inputs = ("clk", "reset")
        self.outputs = (
            *(f"q{i}" for i in range(width)),
            *(f"pc{i}" for i in range(4)),
            "zero",
            "halt",
        )
        prog = instance.params.get("data") or instance.params.get("program") or []
        self._prog = [int(x) for x in prog] if isinstance(prog, list) else []
        self._acc = 0
        self._pc = 0
        self._halt = 0
        self._tick = -1
        self._fired_tick = -1
        self._last_clk: Signal = None

    def drive(self, tick: int) -> Pins:
        self._tick = tick
        out: Pins = {f"q{i}": (self._acc >> i) & 1 for i in range(self._w)}
        for i in range(4):
            out[f"pc{i}"] = (self._pc >> i) & 1
        out["zero"] = int(self._acc == 0)
        out["halt"] = self._halt
        return out

    def rising(self, pins: Pins) -> bool:
        clk = pins.get("clk")
        if clk is None:  # no external clock wired -> free-run one instruction per tick
            return self._tick != self._fired_tick
        return self._last_clk == 0 and clk == 1

    def remember(self, pins: Pins) -> None:
        self._last_clk = pins.get("clk")

    def next_state(self, pins: Pins) -> tuple[int, int, int]:
        if pins.get("reset"):
            return (0, 0, 0)
        if self._halt:
            return (self._acc, self._pc, 1)
        word = self._prog[self._pc] if 0 <= self._pc < len(self._prog) else 0
        op = (word >> self._w) & 0x7
        arg = word & self._mask
        acc, halt = self._exec(op, arg)
        return (acc & self._mask, (self._pc + 1) % self._slots, halt)

    def apply(self, value: Any) -> None:
        self._acc, self._pc, self._halt = value
        self._fired_tick = self._tick

    def _exec(self, op: int, arg: int) -> tuple[int, int]:
        a = self._acc
        if op == 1:
            return (a - arg, 0)
        if op == 2:
            return (a & arg, 0)
        if op == 3:
            return (a | arg, 0)
        if op == 4:
            return (a ^ arg, 0)
        if op == 5:
            return (arg, 0)
        if op == 6:
            return (a << 1, 0)
        if op == 7:
            return (a, 1)
        return (a + arg, 0)  # op 0 = ADD

    def state(self) -> dict[str, Any]:
        return {"value": self._acc, "pc": self._pc, "on": bool(self._acc), "halt": bool(self._halt)}


_AB = ("a", "b")

_GATES: dict[str, tuple[tuple[str, ...], Callable[[list[int]], int]]] = {
    "and": (_AB, lambda v: int(all(v))),
    "or": (_AB, lambda v: int(any(v))),
    "nand": (_AB, lambda v: int(not all(v))),
    "nor": (_AB, lambda v: int(not any(v))),
    "xor": (_AB, lambda v: sum(v) % 2),
    "xnor": (_AB, lambda v: 1 - sum(v) % 2),
    "not": (("in",), lambda v: 1 - v[0]),
}

def _gate_factory(key: str) -> Callable[[ComponentInstance], LogicElement]:
    inputs, fn = _GATES[key]
    return lambda inst: Gate(inst, inputs, fn)


def _full_adder(p: dict[str, int]) -> Pins:
    total = p["a"] + p["b"] + p["cin"]
    return {"sum": total & 1, "cout": int(total >= 2)}


def _mux4(p: dict[str, int]) -> Pins:
    return {"out": p[f"i{(p['s1'] << 1) | p['s0']}"]}


def _demux4(p: dict[str, int]) -> Pins:
    sel = (p["s1"] << 1) | p["s0"]
    return {f"y{i}": (p["in"] if i == sel else 0) for i in range(4)}


def _decoder(p: dict[str, int]) -> Pins:
    sel = (p["a1"] << 1) | p["a0"]
    return {f"y{i}": (1 if p["en"] and i == sel else 0) for i in range(4)}


def _encoder(p: dict[str, int]) -> Pins:
    idx = max((i for i in range(4) if p[f"i{i}"]), default=0)
    valid = int(any(p[f"i{i}"] for i in range(4)))
    return {"a0": idx & 1, "a1": (idx >> 1) & 1, "valid": valid}


def _comparator(p: dict[str, int]) -> Pins:
    a, b = p["a"], p["b"]
    return {"eq": int(a == b), "gt": int(a > b), "lt": int(a < b)}


_COMBINATIONAL: dict[
    str, tuple[tuple[str, ...], tuple[str, ...], Callable[[dict[str, int]], Pins]]
] = {
    "buffer": (("in",), ("out",), lambda p: {"out": p["in"]}),
    "tristate": (("in", "en"), ("out",), lambda p: {"out": p["in"] if p["en"] else None}),
    "half_adder": (
        ("a", "b"),
        ("sum", "cout"),
        lambda p: {"sum": p["a"] ^ p["b"], "cout": p["a"] & p["b"]},
    ),
    "full_adder": (("a", "b", "cin"), ("sum", "cout"), _full_adder),
    "comparator": (("a", "b"), ("eq", "gt", "lt"), _comparator),
    "mux4": (("i0", "i1", "i2", "i3", "s0", "s1"), ("out",), _mux4),
    "demux4": (("in", "s0", "s1"), ("y0", "y1", "y2", "y3"), _demux4),
    "decoder2to4": (("a0", "a1", "en"), ("y0", "y1", "y2", "y3"), _decoder),
    "encoder4to2": (("i0", "i1", "i2", "i3"), ("a0", "a1", "valid"), _encoder),
}


def _comb_factory(key: str) -> Callable[[ComponentInstance], LogicElement]:
    inputs, outputs, fn = _COMBINATIONAL[key]
    return lambda inst: Combinational(inst, inputs, outputs, fn)


_FACTORIES: dict[str, Callable[[ComponentInstance], LogicElement]] = {
    "input": LogicInput,
    "clock": Clock,
    "output": lambda inst: Probe(inst, "in"),
    "led": lambda inst: Probe(inst, "anode"),
    "mux2": Mux2,
    "dff": DFlipFlop,
    "tff": TFlipFlop,
    "jkff": JKFlipFlop,
    "srff": SRFlipFlop,
    "counter4": lambda inst: Counter(inst, 4),
    "counter8": lambda inst: Counter(inst, 8),
    "shift8": lambda inst: ShiftRegister(inst, 8),
    "register4": lambda inst: Register(inst, 4),
    "register8": lambda inst: Register(inst, 8),
    "alu4": lambda inst: Alu(inst, 4),
    "alu8": lambda inst: Alu(inst, 8),
    "rom16": lambda inst: Rom(inst, 4, 4),
    "ram16": lambda inst: Ram(inst, 4, 4),
    "cpu": lambda inst: Cpu(inst),
    # DC rails double as constant logic levels so ICs can be tied to VCC / GND.
    "ground": lambda inst: Rail(inst, {"gnd": 0}),
    "dc_supply": lambda inst: Rail(inst, {"+": 1, "-": 0}),
    "battery_lipo": lambda inst: Rail(inst, {"+": 1, "-": 0}),
    **{key: _gate_factory(key) for key in _GATES},
    **{key: _comb_factory(key) for key in _COMBINATIONAL},
}

LOGIC_KEYS = frozenset(_FACTORIES)

# DC power rails usable as logic levels (VCC = 1, GND = 0).
POWER_RAILS = frozenset({"ground", "dc_supply", "battery_lipo"})

# Keys that belong unmistakably to the digital engine (not shared with analog), used
# to decide whether a rail-powered circuit is digital or should go to the analog engine.
DIGITAL_ONLY_KEYS = LOGIC_KEYS - POWER_RAILS - frozenset({"led"})


def build_element(instance: ComponentInstance) -> LogicElement | None:
    factory = _FACTORIES.get(instance.component_key)
    return factory(instance) if factory else None
