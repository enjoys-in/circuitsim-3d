"""CircuitSim MCP server (open, no authentication).

Run over stdio (default, for IDE/desktop MCP clients)::

    python -m app.mcp.server

Or expose an open HTTP endpoint (no auth) for networked clients::

    python -m app.mcp.server --transport streamable-http --host 0.0.0.0 --port 8765

Design goals for the tools below:
* Unambiguous names and descriptions so an assistant is never confused.
* Rich per-parameter schemas (via ``Field(description=...)``).
* ``ToolAnnotations`` flags so callers know every tool is read-only and safe.
* A dedicated ``how_to_use`` guide tool/resource that explains the whole flow.

Every tool/resource delegates to :class:`SimulationStudio`, the reusable facade
over the existing engines and catalog — a single source of truth.
"""
from __future__ import annotations

import argparse
import json
import os
from typing import Annotated, Any

from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations
from pydantic import Field

from app.core.exceptions import DomainError
from app.mcp.examples import EXAMPLES, EXAMPLES_BY_ID
from app.mcp.guide import USAGE_GUIDE
from app.mcp.studio import SimulationStudio

INSTRUCTIONS = """
CircuitSim designs and simulates electronics (analog, digital and MCU firmware).

Fastest path to a correct call:
  1. call how_to_use once to learn the format, or list_components to find parts.
  2. describe the circuit as `parts` and `wires`.
  3. run_simulation (or validate_circuit first) and read the results.

Circuit shape:
  parts: [{ "id": "R1", "type": "resistor", "params": {"resistance": 220} }]
  wires: [["V:+", "R1:a"], ["R1:b", "V:-"]]     # endpoints are "<id>:<pin>"

Engines: analog (DC/transient), digital (logic), mcu (firmware + sensors).
Leave `engine` empty to auto-select. Analog and MCU circuits need a ground/return.
All tools are read-only and deterministic — safe to call anytime.
""".strip()

# Everything here is side-effect free and deterministic.
READ_ONLY = ToolAnnotations(read_only_hint=True, idempotent_hint=True, open_world_hint=False)

# Reusable, well-documented parameter schemas shared by the build/run tools.
PartsParam = Annotated[
    list[dict[str, Any]],
    Field(
        description=(
            "Components to place. Each item: {\"id\": unique string, \"type\": a catalog "
            "component key (e.g. 'resistor', 'dc_supply', 'led', 'and', 'esp32_devkit'), "
            "optional \"params\": {}, optional \"label\": string}. Discover keys and their "
            "default params with list_components / get_component."
        ),
        examples=[[{"id": "R1", "type": "resistor", "params": {"resistance": 220}}]],
    ),
]
WiresParam = Annotated[
    list[Any],
    Field(
        description=(
            "Connections between pins. Each item is a pair like [\"V:+\", \"R1:a\"] joining two "
            "\"<instance id>:<pin name>\" endpoints. Use "
            "{\"endpoints\": [\"a:p\", \"b:p\", \"c:p\"]} "
            "to tie 3+ pins to one node. Pin names come from get_component."
        ),
        examples=[[["V:+", "R1:a"], ["R1:b", "V:-"]]],
    ),
]
EngineParam = Annotated[
    str | None,
    Field(
        default=None,
        description=(
            "Force a specific engine: 'analog', 'digital' or 'mcu'. Omit (null) to "
            "auto-select from the parts used."
        ),
    ),
]
OptionsParam = Annotated[
    dict[str, Any] | None,
    Field(
        default=None,
        description=(
            "Engine options. analog: {\"analysis\": \"op\"|\"tran\", \"t_stop\": s, \"steps\": n}. "
            "digital: {\"ticks\": n}. mcu: {\"ticks\": n, \"tick_ms\": ms}. See list_engines."
        ),
    ),
]

studio = SimulationStudio()
server = MCPServer(
    name="circuitsim",
    title="CircuitSim Simulator",
    version="0.1.0",
    instructions=INSTRUCTIONS,
)


# --------------------------------------------------------------------------- #
# Guide / discovery                                                           #
# --------------------------------------------------------------------------- #
@server.tool(
    title="How to use CircuitSim",
    description=(
        "START HERE. Returns a structured guide: the 4-step workflow, the exact "
        "`parts`/`wires` circuit format, how engines are auto-selected, their options, "
        "common errors with fixes, and a worked example. Call this first if unsure."
    ),
    annotations=READ_ONLY,
)
def how_to_use() -> dict[str, Any]:
    return USAGE_GUIDE


@server.tool(
    title="Project info",
    description=(
        "Project identity, available engines and catalog statistics "
        "(part counts by category)."
    ),
    annotations=READ_ONLY,
)
def get_project_info() -> dict[str, Any]:
    return studio.project_info()


@server.tool(
    title="List engines",
    description=(
        "List the simulation engines with what each one handles, whether it needs a "
        "ground, and its accepted `options`. Use to decide the `engine`/`options` for a run."
    ),
    annotations=READ_ONLY,
)
def list_engines() -> dict[str, Any]:
    return {"engines": studio.engines(), "guide": studio.engine_guide()}


@server.tool(
    title="Host capabilities",
    description=(
        "Host environment: OS, Python version and any detected native "
        "toolchains (ngspice, kicad, ...)."
    ),
    annotations=READ_ONLY,
)
def get_capabilities() -> dict[str, Any]:
    return studio.capabilities()


# --------------------------------------------------------------------------- #
# Catalog / design                                                            #
# --------------------------------------------------------------------------- #
@server.tool(
    title="List components",
    description=(
        "Browse the component catalog to find part `type` keys and their pins. "
        "Optionally filter by category or a free-text search."
    ),
    annotations=READ_ONLY,
)
def list_components(
    category: Annotated[
        str | None,
        Field(
            default=None,
            description=(
                "Filter by category: passive, semiconductor, power, sensor, dev_board, "
                "logic, actuator, connector or pcb. Omit for all."
            ),
        ),
    ] = None,
    search: Annotated[
        str | None,
        Field(
            default=None,
            description="Free-text match on key, name, subcategory, description or tags.",
        ),
    ] = None,
    limit: Annotated[
        int,
        Field(default=100, ge=1, le=500, description="Maximum number of components to return."),
    ] = 100,
) -> dict[str, Any]:
    items = studio.list_components(category=category, search=search, limit=limit)
    return {"count": len(items), "components": items}


@server.tool(
    title="Get component",
    description=(
        "Full details for one component: its exact pin names, default params and tags. "
        "Call this before wiring an unfamiliar part so you use the right pin names."
    ),
    annotations=READ_ONLY,
)
def get_component(
    key: Annotated[
        str,
        Field(description="The component key, e.g. 'resistor', 'esp32_devkit' or 'and'."),
    ],
) -> dict[str, Any]:
    try:
        return studio.get_component(key)
    except DomainError as exc:
        return {"error": str(exc)}


# --------------------------------------------------------------------------- #
# Build / validate / run                                                      #
# --------------------------------------------------------------------------- #
@server.tool(
    title="Validate circuit",
    description=(
        "Check a design WITHOUT running it. Reports wiring problems (unknown parts, "
        "bad pin names, dangling references) and which engine would simulate it. "
        "Use this to fix a circuit before run_simulation."
    ),
    annotations=READ_ONLY,
)
def validate_circuit(parts: PartsParam, wires: WiresParam) -> dict[str, Any]:
    try:
        circuit = studio.build_circuit(parts, wires)
    except DomainError as exc:
        return {"ok": False, "issues": [str(exc)]}
    return studio.validate(circuit)


@server.tool(
    title="Run simulation",
    description=(
        "Build a circuit from `parts` + `wires` and simulate it. Leave `engine` empty to "
        "auto-select. Returns: `engine`, `results` (nets, instance states, `series` waveforms, "
        "`frames`, `log`, `warnings`) and a compact `summary_view`. This is the main tool."
    ),
    annotations=READ_ONLY,
)
def run_simulation(
    parts: PartsParam,
    wires: WiresParam,
    engine: EngineParam = None,
    options: OptionsParam = None,
) -> dict[str, Any]:
    try:
        return studio.build_and_run(parts, wires, engine=engine, options=options)
    except DomainError as exc:
        return {"error": str(exc)}


@server.tool(
    title="Run circuit JSON",
    description=(
        "Simulate a full Circuit object {\"instances\": [...], \"nets\": [...]} such as a "
        "saved project's `circuit` field. Prefer run_simulation for the simpler parts/wires form."
    ),
    annotations=READ_ONLY,
)
def run_circuit_json(
    circuit: Annotated[
        dict[str, Any],
        Field(
            description=(
                "A Circuit object with `instances` and `nets`, "
                "e.g. a project's circuit field."
            ),
        ),
    ],
    engine: EngineParam = None,
    options: OptionsParam = None,
) -> dict[str, Any]:
    from app.domain.entities.project import Circuit

    try:
        model = Circuit.model_validate(circuit)
        return studio.run(model, engine=engine, options=options)
    except DomainError as exc:
        return {"error": str(exc)}
    except ValueError as exc:
        return {"error": f"invalid circuit: {exc}"}


# --------------------------------------------------------------------------- #
# Examples                                                                     #
# --------------------------------------------------------------------------- #
@server.tool(
    title="List examples",
    description="List runnable example designs (id, engine and description) you can fetch and run.",
    annotations=READ_ONLY,
)
def list_examples() -> dict[str, Any]:
    return {
        "examples": [
            {
                "id": ex["id"],
                "engine": ex["engine"],
                "title": ex["title"],
                "description": ex["description"],
            }
            for ex in EXAMPLES
        ]
    }


@server.tool(
    title="Get example",
    description=(
        "Fetch one example design by id — returns `parts`, `wires` and "
        "`options` ready for run_simulation."
    ),
    annotations=READ_ONLY,
)
def get_example(
    example_id: Annotated[
        str,
        Field(
            description=(
                "Example id from list_examples, e.g. 'voltage_divider' "
                "or 'esp32_thermostat'."
            ),
        ),
    ],
) -> dict[str, Any]:
    example = EXAMPLES_BY_ID.get(example_id)
    if example is None:
        return {"error": f"unknown example '{example_id}'", "available": list(EXAMPLES_BY_ID)}
    return example


# --------------------------------------------------------------------------- #
# Resources                                                                    #
# --------------------------------------------------------------------------- #
@server.resource("circuitsim://guide", mime_type="application/json")
def resource_guide() -> str:
    return json.dumps(USAGE_GUIDE, indent=2)


@server.resource("circuitsim://info", mime_type="application/json")
def resource_info() -> str:
    return json.dumps(studio.project_info(), indent=2)


@server.resource("circuitsim://engines", mime_type="application/json")
def resource_engines() -> str:
    return json.dumps(studio.engine_guide(), indent=2)


@server.resource("circuitsim://catalog", mime_type="application/json")
def resource_catalog() -> str:
    return json.dumps(studio.list_components(), indent=2)


@server.resource("circuitsim://examples", mime_type="application/json")
def resource_examples() -> str:
    return json.dumps(EXAMPLES, indent=2)


# --------------------------------------------------------------------------- #
# Prompt                                                                       #
# --------------------------------------------------------------------------- #
@server.prompt(description="Guide the assistant to design and simulate a circuit for a goal.")
def design_circuit(goal: str) -> str:
    return (
        f"Design a circuit that achieves this goal: {goal}\n\n"
        "Steps:\n"
        "1. Call how_to_use (once) and list_components/get_component to pick parts and read pins.\n"
        "2. Assemble `parts` and `wires`; include a ground/return for analog or MCU designs.\n"
        "3. Call validate_circuit to confirm the wiring and chosen engine.\n"
        "4. Call run_simulation and interpret the nets, instance states, waveforms and warnings.\n"
        "Report the final design (parts + wires) and the key results."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="CircuitSim MCP server (open, no auth).")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse", "streamable-http"],
        default=os.environ.get("CIRCUITSIM_MCP_TRANSPORT", "stdio"),
        help="Transport to serve on (default: stdio).",
    )
    parser.add_argument(
        "--host",
        default=os.environ.get("CIRCUITSIM_MCP_HOST", "127.0.0.1"),
        help="Bind host for HTTP transports (default: 127.0.0.1).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("CIRCUITSIM_MCP_PORT", "8765")),
        help="Bind port for HTTP transports (default: 8765).",
    )
    args = parser.parse_args()

    if args.transport == "stdio":
        server.run(transport="stdio")
    else:
        server.run(transport=args.transport, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
