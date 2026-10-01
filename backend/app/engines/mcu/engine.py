from __future__ import annotations

from typing import Any

from app.domain.engines import SimulationEngine
from app.domain.entities.project import Circuit, ComponentInstance
from app.engines.analog.devices import ANALOG_KEYS
from app.engines.analog.network import AnalogNetwork
from app.engines.analog.units import format_si
from app.engines.custom import simulatable_keys
from app.engines.mcu.boards import BOARD_KEYS, BOARD_PROFILES
from app.engines.mcu.peripherals import (
    DISPLAY_KEYS,
    MAX_DISPLAY_CHARS,
    MAX_DISPLAY_LINES,
    PERIPHERAL_KEYS,
    PERIPHERAL_MODELS,
    SERVO_KEYS,
)
from app.engines.mcu.runtime import BoardRuntime, PinDrive
from app.engines.mcu.sandbox import FirmwareError
from app.engines.mcu.sensors import HALL_TRIGGER_MT, SENSOR_KEYS, SENSOR_MODELS
from app.engines.netlist import Netlist
from app.engines.result import ResultBuilder

MAX_TICKS = 600
MAX_LOG_LINES = 1000
INA219_BUS = (("sda", "scl"), 3.0)
INA219_UNITS = {"current": "A", "bus_voltage": "V", "power": "W"}


def _option(options: dict[str, Any], key: str, default: float, low: float, high: float) -> float:
    try:
        return min(max(float(options.get(key) or default), low), high)
    except (TypeError, ValueError):
        return default


def _ground_nodes(circuit: Circuit, netlist: Netlist) -> set[int]:
    ground: set[int] = set()
    for inst in circuit.instances:
        if inst.component_key in BOARD_KEYS:
            pins = BOARD_PROFILES[inst.component_key].grounds
        elif inst.component_key == "ground":
            pins = ("gnd",)
        else:
            continue
        ground.update(n for pin in pins if (n := netlist.node(inst.id, pin)) is not None)
    return ground


def _rounded(state: dict[str, Any]) -> dict[str, Any]:
    return {k: round(v, 6) if isinstance(v, float) else v for k, v in state.items()}


class McuSimulation:
    def __init__(self, circuit: Circuit, options: dict[str, Any]) -> None:
        self.netlist = Netlist(circuit)
        self.result = ResultBuilder("mcu", "firmware").timebase("s")
        self.ticks = int(_option(options, "ticks", 20, 1, MAX_TICKS))
        self.tick_ms = _option(options, "tick_ms", 500, 1, 60_000)
        self.progress = 0.0
        self.sensors = [i for i in circuit.instances if i.component_key in SENSOR_KEYS | {"ina219"}]
        self.readings: dict[str, dict[str, float]] = {}
        self.peripherals = [i for i in circuit.instances if i.component_key in PERIPHERAL_KEYS]
        self.servo_angles: dict[str, float] = {}
        self.display_lines: dict[str, list[str]] = {}
        self._periph_label = {
            p.id: p.label or PERIPHERAL_MODELS[p.component_key].name for p in self.peripherals
        }
        self._pending: dict[tuple[str, str], tuple[float, str, str]] = {}
        self._log_lines = 0
        self.result_time = 0.0

        boards = [i for i in circuit.instances if i.component_key in BOARD_KEYS]
        ground = _ground_nodes(circuit, self.netlist)
        self.network = AnalogNetwork(
            circuit, ground_nodes=ground, skip=BOARD_KEYS | SENSOR_KEYS | PERIPHERAL_KEYS
        )
        self.boards = [BoardRuntime(b, BOARD_PROFILES[b.component_key], self) for b in boards]
        self._drives: list[tuple[BoardRuntime, PinDrive]] = []

    def voltage_at(self, instance_id: str, pin: str) -> float | None:
        node = self.netlist.node(instance_id, pin)
        return None if node is None else self.network.voltage(node)

    def log(self, source: str, text: str) -> None:
        if self._log_lines < MAX_LOG_LINES:
            self.result.log(self.result_time, source, text[:500])
            self._log_lines += 1

    def read_sensor(self, board: BoardRuntime, name: str, quantity: str) -> float | None:
        sensor = self._find_sensor(name)
        if sensor is None:
            self.result.warn(f"{board.label}: no sensor named '{name}' in the circuit")
            return None
        label = sensor.label or sensor.component_key
        if sensor.component_key == "ina219":
            return self._read_ina219(board, sensor, label, quantity)
        model = SENSOR_MODELS[sensor.component_key]
        if quantity not in model.quantities:
            options = ", ".join(model.quantities)
            raise FirmwareError(f"{model.name} has no '{quantity}' reading (available: {options})")
        problem = self._wiring_problem(sensor, board, model.bus_pins, model.min_voltage)
        if problem:
            self.result.warn(f"{label}: {problem}")
            return None
        value = model.value(sensor.params, quantity, self.progress)
        self._remember(sensor, label, quantity, value, model.quantities[quantity].unit)
        return value

    def drive_servo(self, board: BoardRuntime, pin: str, angle: object) -> None:
        servo = self._peripheral_on_pin(board, pin, SERVO_KEYS)
        if servo is None:
            self.result.warn(f"{board.label}: no servo signal wired to {pin}")
            return
        if not self._peripheral_powered(servo):
            self.result.warn(f"{self._periph_label[servo.id]}: not powered")
            return
        try:
            value = float(angle)
        except (TypeError, ValueError):
            self.result.warn(f"{self._periph_label[servo.id]}: invalid angle {angle!r}")
            return
        self.servo_angles[servo.id] = round(min(max(value, 0.0), 180.0), 1)

    def display_write(self, board: BoardRuntime, text: str) -> None:
        display = self._display_on_board(board)
        if display is None:
            self.result.warn(f"{board.label}: no display wired to the I2C bus")
            return
        if not self._peripheral_powered(display):
            self.result.warn(f"{self._periph_label[display.id]}: not powered")
            return
        lines = self.display_lines.setdefault(display.id, [])
        lines.append(text[:MAX_DISPLAY_CHARS])
        del lines[:-MAX_DISPLAY_LINES]

    def display_clear(self, board: BoardRuntime) -> None:
        display = self._display_on_board(board)
        if display is not None:
            self.display_lines[display.id] = []

    def _peripheral_on_pin(
        self, board: BoardRuntime, pin: str, keys: frozenset[str]
    ) -> ComponentInstance | None:
        node = self.netlist.node(board.id, pin)
        if node is None:
            return None
        for peripheral in self.peripherals:
            if peripheral.component_key in keys:
                signal = PERIPHERAL_MODELS[peripheral.component_key].signal_pins[0]
                if self.netlist.node(peripheral.id, signal) == node:
                    return peripheral
        return None

    def _display_on_board(self, board: BoardRuntime) -> ComponentInstance | None:
        for peripheral in self.peripherals:
            if peripheral.component_key not in DISPLAY_KEYS:
                continue
            wired = all(
                (node := self.netlist.node(peripheral.id, pin)) is not None
                and board.id in self.netlist.instances_on(node)
                for pin in ("sda", "scl")
            )
            if wired:
                return peripheral
        return None

    def _peripheral_powered(self, peripheral: ComponentInstance) -> bool:
        if self.netlist.node(peripheral.id, "vcc") is None:
            return False
        model = PERIPHERAL_MODELS[peripheral.component_key]
        return (self.voltage_at(peripheral.id, "vcc") or 0.0) >= model.min_voltage

    def run(self) -> dict[str, Any]:
        for board in self.boards:
            if board.fault:
                self._fault(board, board.fault)
        self._solve()
        for tick in range(self.ticks):
            self.progress = tick / max(1, self.ticks - 1)
            self.result_time = round(tick * self.tick_ms / 1000, 6)
            self.result.sample(self.result_time)
            for board in self.boards:
                fault = board.step(tick)
                if fault:
                    self._fault(board, fault)
            self._solve()
            self._record()
        self._finish()
        return self.result.build()

    def _find_sensor(self, name: str) -> ComponentInstance | None:
        wanted = name.strip().lower()
        for sensor in self.sensors:
            if wanted in {sensor.id.lower(), sensor.component_key, (sensor.label or "").lower()}:
                return sensor
        return None

    def _read_ina219(
        self, board: BoardRuntime, sensor: ComponentInstance, label: str, quantity: str
    ) -> float | None:
        problem = self._wiring_problem(sensor, board, *INA219_BUS)
        if problem:
            self.result.warn(f"{label}: {problem}")
            return None
        device = next(d for d in self.network.devices if d.id == sensor.id)
        readings = device.report(self.network.context)["readings"]
        if quantity not in readings:
            raise FirmwareError(
                f"INA219 has no '{quantity}' reading (available: {', '.join(readings)})"
            )
        self._remember(sensor, label, quantity, readings[quantity], INA219_UNITS[quantity])
        return float(readings[quantity])

    def _remember(
        self, sensor: ComponentInstance, label: str, quantity: str, value: float, unit: str
    ) -> None:
        self.readings.setdefault(sensor.id, {})[quantity] = value
        self._pending[(sensor.id, quantity)] = (value, f"{label} {quantity}", unit)

    def _wiring_problem(
        self,
        sensor: ComponentInstance,
        board: BoardRuntime,
        bus_pins: tuple[str, ...],
        min_voltage: float,
    ) -> str | None:
        if self.netlist.node(sensor.id, "vcc") is None:
            return "VCC is not connected"
        if self.netlist.node(sensor.id, "gnd") not in self.network.ground:
            return f"GND is not connected to {board.label} ground"
        vcc = self.voltage_at(sensor.id, "vcc") or 0.0
        if vcc < min_voltage:
            return f"VCC is {vcc:.2f} V, needs at least {min_voltage} V"
        for pin in bus_pins:
            node = self.netlist.node(sensor.id, pin)
            if node is None or board.id not in self.netlist.instances_on(node):
                return f"{pin.upper()} is not wired to {board.label}"
        return None

    def _solve(self) -> None:
        self._drives = [
            (board, drive) for board in self.boards for drive in board.drives(self.netlist)
        ]
        drives = [(node, volts, r) for _, (_, node, volts, r) in self._drives]
        drives.extend(self._hall_drives())
        self.network.set_drives(drives)
        self.network.solve_op()

    def _hall_drives(self) -> list[tuple[int, float, float]]:
        drives = []
        for sensor in self.sensors:
            if sensor.component_key != "hall_sensor":
                continue
            node = self.netlist.node(sensor.id, "out")
            powered = (self.voltage_at(sensor.id, "vcc") or 0.0) >= SENSOR_MODELS[
                "hall_sensor"
            ].min_voltage
            field = SENSOR_MODELS["hall_sensor"].value(sensor.params, "field", self.progress)
            if node is not None and powered and abs(field) >= HALL_TRIGGER_MT:
                drives.append((node, 0.0, 50.0))
        return drives

    def _record(self) -> None:
        for board in self.boards:
            for pin, level in board.outputs.items():
                self.result.point(
                    f"{board.id}.{pin}", level, label=f"{board.label} {pin}", kind="digital"
                )
        for (sensor_id, quantity), (value, label, unit) in self._pending.items():
            self.result.point(f"{sensor_id}.{quantity}", value, label=label, unit=unit)
        self._pending.clear()
        for board, (pin, node, volts, r) in self._drives:
            sourced = abs(volts - self.network.voltage(node)) / r
            if pin in board.outputs and sourced > board.profile.max_pin_current:
                self.result.warn(
                    f"{board.label} {pin} drives {format_si(sourced, 'A')}, over the "
                    f"{format_si(board.profile.max_pin_current, 'A')} pin limit"
                )
        for servo_id, angle in self.servo_angles.items():
            self.result.point(
                f"{servo_id}.angle",
                angle,
                label=f"{self._periph_label[servo_id]} angle",
                unit="deg",
            )
        self.result.frame(self._nets(), self._states())

    def _states(self) -> dict[str, dict[str, Any]]:
        ctx = self.network.context
        states = {d.id: _rounded(d.report(ctx)) for d in self.network.devices}
        for board in self.boards:
            states[board.id] = board.state()
        for sensor in self.sensors:
            states.setdefault(sensor.id, {})["readings"] = dict(self.readings.get(sensor.id, {}))
        for servo_id, angle in self.servo_angles.items():
            states.setdefault(servo_id, {}).update({"angle": angle, "on": True})
        for display_id, lines in self.display_lines.items():
            states.setdefault(display_id, {}).update(
                {"lines": list(lines), "text": "\n".join(lines)}
            )
        return states

    def _nets(self) -> dict[str, Any]:
        return self.network.netlist.by_net(
            {n: round(v, 6) for n, v in self.network.node_voltages().items()}
        )

    def _fault(self, board: BoardRuntime, message: str) -> None:
        self.result.log(self.result_time, board.label, f"firmware halted: {message}")
        self.result.warn(f"{board.label} firmware error: {message}")

    def _finish(self) -> None:
        self.result.nets(self._nets())
        for instance_id, state in self._states().items():
            self.result.instance(instance_id, **state)
        for board in self.boards:
            high = [pin for pin, level in board.outputs.items() if level]
            self.result.summary(f"{board.label} pins high", ", ".join(high) or "none")
        for sensor in self.sensors:
            model = SENSOR_MODELS.get(sensor.component_key)
            label = sensor.label or sensor.component_key
            for quantity, value in self.readings.get(sensor.id, {}).items():
                unit = model.quantities[quantity].unit if model else INA219_UNITS[quantity]
                self.result.summary(f"{label} {quantity}", value, unit)
        for servo_id, angle in self.servo_angles.items():
            self.result.summary(f"{self._periph_label[servo_id]} angle", angle, "deg")
        for display_id, lines in self.display_lines.items():
            if lines:
                self.result.summary(self._periph_label[display_id], " / ".join(lines))
        for warning in (*self.network.warnings, *self.network.device_warnings()):
            self.result.warn(warning)


class McuEngine(SimulationEngine):
    name = "mcu"

    def supports(self, circuit: Circuit) -> bool:
        keys = simulatable_keys(circuit)
        return bool(keys & BOARD_KEYS) and keys <= (
            BOARD_KEYS | SENSOR_KEYS | ANALOG_KEYS | PERIPHERAL_KEYS
        )

    def run(self, circuit: Circuit, options: dict[str, Any]) -> dict[str, Any]:
        return McuSimulation(circuit, options).run()
