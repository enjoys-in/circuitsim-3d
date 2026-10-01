from __future__ import annotations

from collections.abc import Callable
from typing import Any, Protocol

from app.domain.entities.project import ComponentInstance
from app.engines.mcu.boards import BoardProfile
from app.engines.mcu.sandbox import Firmware, FirmwareError
from app.engines.netlist import Netlist

OUTPUT_RESISTANCE = 25.0
PULL_RESISTANCE = 45_000.0
INPUT_LEAKAGE_RESISTANCE = 10e6
SUPPLY_RESISTANCE = 0.05

PinDrive = tuple[str, int, float, float]


class World(Protocol):
    tick_ms: float

    def voltage_at(self, instance_id: str, pin: str) -> float | None: ...

    def read_sensor(self, board: BoardRuntime, name: str, quantity: str) -> float | None: ...

    def drive_servo(self, board: BoardRuntime, pin: str, angle: object) -> None: ...

    def display_write(self, board: BoardRuntime, text: str) -> None: ...

    def display_clear(self, board: BoardRuntime) -> None: ...

    def log(self, source: str, text: str) -> None: ...


class BoardRuntime:
    def __init__(self, instance: ComponentInstance, profile: BoardProfile, world: World) -> None:
        self.instance = instance
        self.profile = profile
        self.world = world
        self.label = instance.label or profile.name
        self.outputs: dict[str, int] = {}
        self.modes: dict[str, str] = {}
        self.scope: dict[str, Any] = {}
        self.fault: str | None = None
        self.tick = 0
        self.firmware: Firmware | None = None
        try:
            self.firmware = Firmware(str(instance.params.get("firmware", "")))
        except FirmwareError as exc:
            self.fault = str(exc)
        self._builtins = self._api()

    @property
    def id(self) -> str:
        return self.instance.id

    def step(self, tick: int) -> str | None:
        if self.firmware is None or self.fault:
            return None
        self.tick = tick
        try:
            self.firmware.run(self.scope, {**self._builtins, "tick": tick})
        except FirmwareError as exc:
            self.fault = str(exc)
            return self.fault
        return None

    def drives(self, netlist: Netlist) -> list[PinDrive]:
        items: list[PinDrive] = []
        for pin, volts in self.profile.supplies.items():
            node = netlist.node(self.id, pin)
            if node is not None:
                items.append((pin, node, volts, SUPPLY_RESISTANCE))
        for pin in self.profile.gpio:
            node = netlist.node(self.id, pin)
            if node is None:
                continue
            items.append((pin, node, *self._pin_drive(pin)))
        return items

    def state(self) -> dict[str, Any]:
        led = self.profile.onboard_led
        return {
            "on": self.firmware is not None and self.fault is None,
            "pins": dict(self.outputs),
            "onboard_led": bool(led and self.outputs.get(led) == 1),
            "fault": self.fault,
        }

    def _pin_drive(self, pin: str) -> tuple[float, float]:
        if pin in self.outputs:
            return self.outputs[pin] * self.profile.logic_voltage, OUTPUT_RESISTANCE
        mode = self.modes.get(pin, "input")
        if mode == "input_pullup":
            return self.profile.logic_voltage, PULL_RESISTANCE
        if mode == "input_pulldown":
            return 0.0, PULL_RESISTANCE
        return 0.0, INPUT_LEAKAGE_RESISTANCE

    def _pin(self, pin: object) -> str:
        resolved = self.profile.resolve(pin)
        if resolved is None:
            raise FirmwareError(f"unknown pin {pin!r} on {self.profile.name}")
        return resolved

    def _voltage(self, pin: str) -> float:
        value = self.world.voltage_at(self.id, pin)
        return 0.0 if value is None else value

    def _api(self) -> dict[str, Any]:
        logic = self.profile.logic_voltage

        def digital_write(pin: object, value: object) -> None:
            name = self._pin(pin)
            self.modes[name] = "output"
            self.outputs[name] = 1 if value else 0

        def digital_read(pin: object) -> int:
            return 1 if self._voltage(self._pin(pin)) > logic * 0.5 else 0

        def analog_read(pin: object) -> int:
            ratio = min(max(self._voltage(self._pin(pin)) / logic, 0.0), 1.0)
            return round(ratio * self.profile.adc_max)

        def pin_mode(pin: object, mode: object) -> None:
            name, chosen = self._pin(pin), str(mode).lower()
            if chosen not in {"input", "output", "input_pullup", "input_pulldown"}:
                raise FirmwareError(f"unknown pin mode {mode!r}")
            self.modes[name] = chosen
            if chosen != "output":
                self.outputs.pop(name, None)

        def read(sensor: object, quantity: object) -> float | None:
            return self.world.read_sensor(self, str(sensor), str(quantity))

        def servo_write(pin: object, angle: object) -> None:
            self.world.drive_servo(self, self._pin(pin), angle)

        def display_print(*args: object) -> None:
            self.world.display_write(self, " ".join(str(a) for a in args))

        def display_clear() -> None:
            self.world.display_clear(self)

        def log(*args: object) -> None:
            self.world.log(self.label, " ".join(str(a) for a in args))

        def millis() -> int:
            return int(self.tick * self.world.tick_ms)

        functions: dict[str, Callable[..., Any]] = {
            "digital_write": digital_write,
            "digital_read": digital_read,
            "analog_read": analog_read,
            "pin_mode": pin_mode,
            "read": read,
            "servo_write": servo_write,
            "display_print": display_print,
            "display_clear": display_clear,
            "print": log,
            "millis": millis,
            "abs": abs,
            "min": min,
            "max": max,
            "round": round,
            "int": int,
            "float": float,
            "str": str,
            "bool": bool,
        }
        constants = {
            "HIGH": 1,
            "LOW": 0,
            "INPUT": "input",
            "OUTPUT": "output",
            "INPUT_PULLUP": "input_pullup",
            "INPUT_PULLDOWN": "input_pulldown",
        }
        return {**functions, **constants}
