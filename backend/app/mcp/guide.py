"""Structured, agent-facing usage guide for the CircuitSim MCP server.

Kept as plain data so it can back both the ``how_to_use`` tool and the
``circuitsim://guide`` resource without duplication. The goal is to remove any
ambiguity about how the tools fit together, what a circuit looks like and how
engines are chosen — so an assistant can use the tools confidently.
"""
from __future__ import annotations

from typing import Any

USAGE_GUIDE: dict[str, Any] = {
    "overview": (
        "CircuitSim designs and simulates electronics. You describe a circuit as "
        "`parts` (components) and `wires` (connections), then run it. Simulation is "
        "pure and deterministic: no state is stored, so tools are safe to call freely."
    ),
    "workflow": [
        "1. DISCOVER  - list_components / get_component to find parts and exact pin names.",
        "2. ASSEMBLE  - build `parts` and `wires`; add a ground/return for analog & mcu.",
        "3. VALIDATE  - validate_circuit to catch wiring mistakes and see the chosen engine.",
        "4. RUN       - run_simulation to get nets, instance states, waveforms, logs, warnings.",
        "   (also: verify_circuit for truth tables, sweep_parameter for transfer curves.)",
    ],
    "circuit_format": {
        "parts": (
            'A list of components. Each: {"id": "<unique>", "type": "<component key>", '
            '"params": {optional}, "label": "<optional>"}. `type` must be a catalog key '
            "from list_components (e.g. 'resistor', 'dc_supply', 'led', 'and', 'esp32_devkit')."
        ),
        "wires": (
            'A list of connections. Each is a pair ["<id>:<pin>", "<id>:<pin>"] joining two '
            'endpoints, where an endpoint is "<instance id>:<pin name>". Get pin names from '
            'get_component. To tie 3+ pins to one node, use {"endpoints": ["a:p", "b:p", "c:p"]}.'
        ),
        "endpoint": 'Always "<instance id>:<pin name>", e.g. "R1:a" or "MCU:gpio23".',
    },
    "engines": {
        "auto_select": (
            "Leave `engine` empty and the best engine is picked from the parts used. "
            "Digital logic, analog parts and MCU boards each run on their own engine; "
            "an MCU board may also drive analog parts and sensors."
        ),
        "analog": {
            "use_for": (
                "resistors, capacitors, inductors, diodes/LEDs, "
                "transistors, sources, regulators"
            ),
            "needs_ground": True,
            "options": {
                "analysis": "'op' (default DC operating point) or 'tran' (time-domain)",
                "t_stop": "transient stop time in seconds (1e-6..100, default 0.01)",
                "steps": "transient steps (10..2000, default 200)",
            },
        },
        "digital": {
            "use_for": "input, output, clock, gates, mux/demux, decoders, flip-flops, adders",
            "needs_ground": False,
            "options": {"ticks": "clock ticks to simulate (default 16, max 512)"},
        },
        "mcu": {
            "use_for": "dev boards (esp32_devkit, ...), i2c/1-wire/uart sensors, servos, displays",
            "needs_ground": True,
            "firmware": 'put sandboxed Python in the board part\'s params.firmware',
            "options": {
                "ticks": "loop iterations (1..600, default 20)",
                "tick_ms": "ms per tick (1..60000, default 500)",
            },
        },
    },
    "tips": [
        "Call get_component before wiring an unfamiliar part to read its exact pin names.",
        "Analog and MCU circuits must have a ground/return path or nothing will conduct.",
        "Every wire endpoint must reference a part `id` you defined in `parts`.",
        "Use validate_circuit first if unsure; it reports issues without running.",
        (
            "Results include a `summary_view` for a quick read and full data "
            "(series/frames) for detail."
        ),
        (
            "Firmware helpers: digital_write, digital_read, pin_mode, "
            "read(sensor, field), print, HIGH, LOW."
        ),
    ],
    "analysis_tools": {
        "oscilloscope_transient": (
            "run_simulation with options {\"analysis\": \"tran\", \"t_stop\": s, \"steps\": n} "
            "returns a `series` waveform per node voltage — the data behind the UI scope."
        ),
        "verify_circuit": (
            "Truth-table / regression check: pass `vectors` of {inputs, expected?} and get a "
            "per-row pass/fail tally. Use options {\"ticks\": n} for sequential (clocked) designs."
        ),
        "sweep_parameter": (
            "DC transfer curve: sweep one instance `param` from `start` to `stop` in `steps` and "
            "read meters (voltmeter/ammeter/led/output) at each point. Add a meter to measure."
        ),
    },
    "common_errors": {
        "unknown component '<x>'": "The `type` is not a catalog key. Call list_components.",
        "has no pin '<p>'": "Wrong pin name. Call get_component to list valid pins.",
        "references unknown instance": "A wire endpoint uses an `id` not present in `parts`.",
        "No engine can simulate this mix": (
            "Parts span incompatible engines; split or fix the design."
        ),
        "Add some components": "The circuit is empty; add parts before running.",
    },
    "worked_example": {
        "goal": "Read the midpoint of a 10V divider (1k over 3k).",
        "parts": [
            {"id": "V", "type": "dc_supply", "params": {"voltage": 10}},
            {"id": "R1", "type": "resistor", "params": {"resistance": 1000}},
            {"id": "R2", "type": "resistor", "params": {"resistance": 3000}},
        ],
        "wires": [["V:+", "R1:a"], ["R1:b", "R2:a"], ["R2:b", "V:-"]],
        "engine": None,
        "options": {},
        "expected": "Auto-selects the analog engine; the R1/R2 midpoint net reads 7.5 V.",
    },
}
