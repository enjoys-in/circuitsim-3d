from __future__ import annotations

import pytest

from app.engines.mcu import McuEngine
from app.engines.mcu.sandbox import Firmware, FirmwareError
from tests.builders import circuit

engine = McuEngine()

THERMOSTAT = """
t = read("bme280", "temperature")
if t is not None:
    print(f"t={t:.1f}")
    digital_write("gpio23", HIGH if t > 30 else LOW)
"""

BME_WIRING = [
    ("MCU:3v3", "S:vcc"),
    ("MCU:gnd", "S:gnd"),
    ("MCU:gpio21", "S:sda"),
    ("MCU:gpio22", "S:scl"),
    ("MCU:gpio23", "R:a"),
    ("R:b", "D:anode"),
    ("D:cathode", "MCU:gnd"),
]


def _thermostat(wiring: list[tuple[str, str]]) -> dict:
    c = circuit(
        [
            ("MCU", "esp32_devkit", {"firmware": THERMOSTAT}),
            ("S", "bme280", {"temperature": 20, "temperature_end": 40}),
            ("R", "resistor", {"resistance": 220}),
            ("D", "led", {}),
        ],
        wiring,
    )
    return engine.run(c, {"ticks": 11})


def test_firmware_reacts_to_sensor_ramp() -> None:
    result = _thermostat(BME_WIRING)
    pin = next(s for s in result["series"] if s["id"] == "MCU.gpio23")["values"]
    assert pin[:5] == [0] * 5 and pin[-5:] == [1] * 5
    assert result["instances"]["D"]["on"]
    assert result["log"][0]["text"] == "t=20.0"


def test_unwired_sensor_is_reported() -> None:
    wiring = [w for w in BME_WIRING if w != ("MCU:gpio22", "S:scl")]
    result = _thermostat(wiring)
    assert any("SCL is not wired" in w for w in result["warnings"])
    assert result["log"] == []


def test_gpio_led_without_resistor_warns() -> None:
    c = circuit(
        [("MCU", "esp32_devkit", {"firmware": 'digital_write("gpio2", 1)'}), ("D", "led", {})],
        [("MCU:gpio2", "D:anode"), ("D:cathode", "MCU:gnd")],
    )
    warnings = engine.run(c, {"ticks": 1})["warnings"]
    assert any("overcurrent" in w for w in warnings)


def test_button_with_pullup_reads_low_when_pressed() -> None:
    firmware = 'pin_mode("gpio4", INPUT_PULLUP)\nprint(digital_read("gpio4"))'
    for pressed, expected in ((0, "1"), (1, "0")):
        c = circuit(
            [
                ("MCU", "esp32_devkit", {"firmware": firmware}),
                ("B", "push_button", {"pressed": pressed}),
            ],
            [("MCU:gpio4", "B:a"), ("B:b", "MCU:gnd")],
        )
        result = engine.run(c, {"ticks": 2})
        assert result["log"][-1]["text"] == expected


@pytest.mark.parametrize(
    "source",
    [
        "import os",
        "().__class__",
        "open('x')",
        "while True:\n    pass",
        "x = 2 ** 10000",
        "def f():\n    pass",
    ],
)
def test_sandbox_rejects_unsafe_code(source: str) -> None:
    with pytest.raises(FirmwareError):
        Firmware(source).run({}, {"open": None})
