"""Local agent capability probing.

Reports what this machine's agent can do so the browser can enable/disable
features gracefully (e.g. native SPICE/MCU toolchains when present).
"""
from __future__ import annotations

import platform
import shutil
import sys

# Optional native toolchains the agent can shell out to when installed.
NATIVE_TOOLS: dict[str, str] = {
    "ngspice": "ngspice",
    "kicad": "kicad-cli",
    "ghdl": "ghdl",
    "verilator": "verilator",
}


def detect_native_tools() -> dict[str, bool]:
    return {name: shutil.which(cmd) is not None for name, cmd in NATIVE_TOOLS.items()}


def system_info() -> dict[str, str]:
    return {
        "os": platform.system(),
        "arch": platform.machine(),
        "python": sys.version.split()[0],
    }
