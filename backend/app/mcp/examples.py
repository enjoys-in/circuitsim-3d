"""Ready-made example designs used by the MCP ``examples`` tool/resource.

Each example is a self-contained ``parts``/``wires`` pair in the same shape the
``run_simulation`` / ``build_circuit`` tools accept, so a client can copy one,
tweak it and run it. The circuits mirror the project's test suite.
"""
from __future__ import annotations

from typing import Any

EXAMPLES: list[dict[str, Any]] = [
    {
        "id": "voltage_divider",
        "engine": "analog",
        "title": "10V voltage divider (1k / 3k)",
        "description": "Op-point analysis; the midpoint net sits at 7.5 V.",
        "parts": [
            {"id": "V", "type": "dc_supply", "params": {"voltage": 10}},
            {"id": "R1", "type": "resistor", "params": {"resistance": 1000}},
            {"id": "R2", "type": "resistor", "params": {"resistance": 3000}},
        ],
        "wires": [
            ["V:+", "R1:a"],
            ["R1:b", "R2:a"],
            ["R2:b", "V:-"],
        ],
        "options": {},
    },
    {
        "id": "led_with_resistor",
        "engine": "analog",
        "title": "Current-limited LED",
        "description": "5V supply, 220Ω series resistor and a red LED.",
        "parts": [
            {"id": "V", "type": "dc_supply", "params": {"voltage": 5}},
            {"id": "R", "type": "resistor", "params": {"resistance": 220}},
            {"id": "D", "type": "led", "params": {"color": "red"}},
        ],
        "wires": [
            ["V:+", "R:a"],
            ["R:b", "D:anode"],
            ["D:cathode", "V:-"],
        ],
        "options": {},
    },
    {
        "id": "rc_transient",
        "engine": "analog",
        "title": "RC charging curve",
        "description": "Transient analysis of a 1k/1uF RC low-pass from 5V.",
        "parts": [
            {"id": "V", "type": "dc_supply", "params": {"voltage": 5}},
            {"id": "R", "type": "resistor", "params": {"resistance": 1000}},
            {"id": "C", "type": "capacitor", "params": {"capacitance": "1uF"}},
        ],
        "wires": [
            ["V:+", "R:a"],
            ["R:b", "C:a"],
            ["C:b", "V:-"],
        ],
        "options": {"analysis": "tran", "t_stop": 0.005, "steps": 500},
    },
    {
        "id": "and_gate",
        "engine": "digital",
        "title": "2-input AND gate",
        "description": "Both inputs high, so the probe reads 1.",
        "parts": [
            {"id": "A", "type": "input", "params": {"value": 1}},
            {"id": "B", "type": "input", "params": {"value": 1}},
            {"id": "G", "type": "and"},
            {"id": "Y", "type": "output"},
        ],
        "wires": [
            ["A:out", "G:a"],
            ["B:out", "G:b"],
            ["G:out", "Y:in"],
        ],
        "options": {"ticks": 4},
    },
    {
        "id": "esp32_thermostat",
        "engine": "mcu",
        "title": "ESP32 thermostat with BME280",
        "description": "Firmware drives a GPIO high once the sensor ramps past 30°C.",
        "parts": [
            {
                "id": "MCU",
                "type": "esp32_devkit",
                "params": {
                    "firmware": (
                        't = read("bme280", "temperature")\n'
                        "if t is not None:\n"
                        '    print(f"t={t:.1f}")\n'
                        '    digital_write("gpio23", HIGH if t > 30 else LOW)\n'
                    )
                },
            },
            {"id": "S", "type": "bme280", "params": {"temperature": 20, "temperature_end": 40}},
            {"id": "R", "type": "resistor", "params": {"resistance": 220}},
            {"id": "D", "type": "led"},
        ],
        "wires": [
            ["MCU:3v3", "S:vcc"],
            ["MCU:gnd", "S:gnd"],
            ["MCU:gpio21", "S:sda"],
            ["MCU:gpio22", "S:scl"],
            ["MCU:gpio23", "R:a"],
            ["R:b", "D:anode"],
            ["D:cathode", "MCU:gnd"],
        ],
        "options": {"ticks": 11},
    },
]

EXAMPLES_BY_ID: dict[str, dict[str, Any]] = {ex["id"]: ex for ex in EXAMPLES}
