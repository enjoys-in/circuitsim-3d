"""Firmware-controlled MCU peripherals (servos, displays).

Unlike sensors (read-only), these are command-driven: firmware sets a servo
angle or writes text to a display. They carry no analog model - the analog
solver ignores unknown keys - so their state lives here and in the result.
"""
from __future__ import annotations

from dataclasses import dataclass

MAX_DISPLAY_LINES = 4
MAX_DISPLAY_CHARS = 24


@dataclass(frozen=True, slots=True)
class PeripheralModel:
    name: str
    kind: str  # "servo" | "display"
    signal_pins: tuple[str, ...]  # servo: ("signal",); display: ("sda", "scl")
    min_voltage: float = 3.0


PERIPHERAL_MODELS: dict[str, PeripheralModel] = {
    "servo_sg90": PeripheralModel("SG90 Servo", "servo", ("signal",), min_voltage=3.0),
    "oled_ssd1306": PeripheralModel("SSD1306 OLED", "display", ("sda", "scl"), min_voltage=2.7),
    "lcd1602_i2c": PeripheralModel("16x2 LCD", "display", ("sda", "scl"), min_voltage=4.5),
}

PERIPHERAL_KEYS = frozenset(PERIPHERAL_MODELS)
SERVO_KEYS = frozenset(k for k, m in PERIPHERAL_MODELS.items() if m.kind == "servo")
DISPLAY_KEYS = frozenset(k for k, m in PERIPHERAL_MODELS.items() if m.kind == "display")
