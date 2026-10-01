"""AI assistant: turns plain-English requests into circuits via an LLM.

Uses an OpenAI-compatible chat API (key from env). The model is grounded in the
real component catalog and asked to return strict JSON; the design it produces is
built and validated with the same :class:`SimulationStudio` the MCP server uses.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.domain.entities.project import Circuit, Position
from app.mcp.studio import SimulationStudio

# A compact pin cheat-sheet for the most-used parts so the model wires correctly.
_COMMON = (
    "resistor",
    "capacitor",
    "led",
    "dc_supply",
    "ground",
    "push_button",
    "spdt_switch",
    "potentiometer",
    "diode",
    "npn_bjt",
    "and",
    "or",
    "not",
    "clock",
    "input",
    "output",
    "dff",
    "counter4",
    "register4",
    "alu4",
    "esp32_devkit",
)

_FORMAT = (
    'Respond ONLY with JSON of the form '
    '{"reply": string, "design": {"parts": [...], "wires": [...]} | null}. '
    'Each part is {"id": "R1", "type": "<component_key>", "params": {...}}. '
    'Each wire is ["<id>:<pin>", "<id>:<pin>", ...] joining pins on one net. '
    "To change the current circuit, return the COMPLETE new design (not a diff). "
    "Use only component keys and pin names from the catalog below. Keep `reply` short "
    "and friendly; set `design` to null when you are only explaining."
)


class AssistantService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._studio = SimulationStudio()

    @property
    def configured(self) -> bool:
        return bool(self._settings.openai_api_key)

    def chat(self, messages: list[dict[str, str]], circuit: Circuit | None) -> dict[str, Any]:
        if not self.configured:
            return {
                "reply": (
                    "The AI assistant isn't configured yet. Set OPENAI_API_KEY (and optionally "
                    "OPENAI_BASE_URL / OPENAI_MODEL) in the backend environment to enable it."
                ),
                "configured": False,
            }
        payload = self._build_messages(messages, circuit)
        try:
            content = self._complete(payload)
        except httpx.HTTPError as exc:
            return {"reply": f"The assistant request failed: {exc}", "configured": True}

        parsed = self._parse(content)
        reply = str(parsed.get("reply") or "").strip() or "Done."
        design = parsed.get("design")
        if not isinstance(design, dict):
            return {"reply": reply, "configured": True}

        try:
            built = self._studio.build_circuit(design.get("parts", []), design.get("wires", []))
        except Exception as exc:  # noqa: BLE001 - surface build errors to the user
            return {"reply": f"{reply}\n\n(Could not build that design: {exc})", "configured": True}

        self._layout(built)
        report = self._studio.validate(built)
        reply = self._with_result(reply, built, report)
        return {
            "reply": reply,
            "circuit": built,
            "configured": True,
            "issues": report.get("issues", []),
        }

    # -- internals ----------------------------------------------------------
    def _complete(self, messages: list[dict[str, str]]) -> str:
        url = f"{self._settings.openai_base_url.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {self._settings.openai_api_key}"}
        body = {
            "model": self._settings.openai_model,
            "messages": messages,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
        }
        with httpx.Client(timeout=45.0) as client:
            res = client.post(url, headers=headers, json=body)
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]

    def _build_messages(
        self, messages: list[dict[str, str]], circuit: Circuit | None
    ) -> list[dict[str, str]]:
        out: list[dict[str, str]] = [{"role": "system", "content": self._system_prompt()}]
        if circuit and circuit.instances:
            out.append(
                {
                    "role": "system",
                    "content": "Current circuit on the board:\n"
                    + circuit.model_dump_json(exclude={"instances": {"__all__": {"position"}}}),
                }
            )
        for msg in messages[-10:]:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            out.append({"role": role, "content": str(msg.get("content", ""))})
        return out

    def _system_prompt(self) -> str:
        valid = set(self._studio.component_keys())
        keys = ", ".join(sorted(valid))
        pins = {k: self._studio.get_component(k)["pins"] for k in _COMMON if k in valid}
        guide = {name: g.get("handles", "") for name, g in self._studio.engine_guide().items()}
        return (
            "You are the circuit design assistant inside CircuitSim, an electronics simulator "
            "with analog, digital and MCU engines. Build and modify circuits for the user.\n\n"
            f"Engines: {json.dumps(guide)}\n\n"
            f"Valid component keys: {keys}\n\n"
            f"Pins for common parts: {json.dumps(pins)}\n\n"
            "Rules: give every part a unique id; connect a pin to a supply/ground as needed; "
            "analog circuits need a `ground`. " + _FORMAT
        )

    @staticmethod
    def _parse(content: str) -> dict[str, Any]:
        try:
            data = json.loads(content)
            return data if isinstance(data, dict) else {"reply": content}
        except json.JSONDecodeError:
            return {"reply": content}

    @staticmethod
    def _layout(circuit: Circuit) -> None:
        for i, inst in enumerate(circuit.instances):
            inst.position = Position(x=40 + (i % 5) * 190, y=60 + (i // 5) * 150)

    def _with_result(self, reply: str, circuit: Circuit, report: dict[str, Any]) -> str:
        if report.get("issues"):
            return reply + "\n\n⚠ " + "; ".join(report["issues"][:3])
        try:
            outcome = self._studio.run(circuit)
        except Exception:  # noqa: BLE001 - simulation is best-effort for the summary
            return reply
        summary = outcome.get("summary_view", {})
        measurements = summary.get("measurements") or []
        bits = [f"{m['label']}: {m['value']} {m.get('unit', '')}".strip() for m in measurements[:3]]
        tail = f" Ran on the {summary.get('engine')} engine."
        if bits:
            tail += " " + "; ".join(bits)
        return reply + tail
