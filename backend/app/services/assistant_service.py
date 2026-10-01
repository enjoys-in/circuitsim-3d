"""AI assistant: turns plain-English requests into circuits via an LLM.

Uses an OpenAI-compatible chat API (key from env). The model is grounded in the
real component catalog and asked to return strict JSON; the design it produces is
built and validated with the same :class:`SimulationStudio` the MCP server uses.
"""
from __future__ import annotations

import contextlib
import json
from collections.abc import Iterator
from dataclasses import dataclass, replace
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


@dataclass
class _Provider:
    name: str
    base_url: str
    model: str
    key: str
    fmt: str  # "openai" | "anthropic"


# Preference when ai_provider="auto" (fast/free first; nvidia last — noted as slow).
_AUTO_ORDER = ("groq", "gemini", "mistral", "openrouter", "openai", "anthropic", "nvidia")

# name -> (base_url, default_model, format)
_DEFAULTS: dict[str, tuple[str, str, str]] = {
    "groq": ("https://api.groq.com/openai/v1", "openai/gpt-oss-120b", "openai"),
    "gemini": (
        "https://generativelanguage.googleapis.com/v1beta/openai",
        "gemini-2.5-flash",
        "openai",
    ),
    "mistral": ("https://api.mistral.ai/v1", "mistral-small-latest", "openai"),
    "openrouter": (
        "https://openrouter.ai/api/v1",
        "meta-llama/llama-3.3-70b-instruct:free",
        "openai",
    ),
    "nvidia": ("https://integrate.api.nvidia.com/v1", "openai/gpt-oss-20b", "openai"),
    "anthropic": ("https://api.anthropic.com/v1", "claude-3-5-haiku-latest", "anthropic"),
}

# Known models the user can pick per request (first entry is the suggested default).
# The model field is free-text too, so any other id the provider supports also works.
_MODELS: dict[str, tuple[str, ...]] = {
    "groq": (
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "qwen/qwen3-32b",
        "moonshotai/kimi-k2-instruct",
    ),
    "gemini": ("gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"),
    "mistral": ("mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"),
    "openrouter": (
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-chat-v3-0324:free",
        "google/gemini-2.0-flash-exp:free",
    ),
    "nvidia": ("openai/gpt-oss-20b", "openai/gpt-oss-120b", "meta/llama-3.3-70b-instruct"),
    "openai": ("gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"),
    "anthropic": (
        "claude-3-5-haiku-latest",
        "claude-3-5-sonnet-latest",
        "claude-sonnet-4-20250514",
    ),
}


def _provider_key(settings: Settings, name: str) -> str | None:
    return {
        "groq": settings.groq_api_key,
        "gemini": settings.gemini_api_key,
        "mistral": settings.mistral_api_key,
        "openrouter": settings.open_router_key,
        "nvidia": settings.nvidia_api_key,
        "openai": settings.openai_api_key,
        "anthropic": settings.anthropic_api_key,
    }.get(name)


def _resolve(settings: Settings, name: str) -> _Provider | None:
    key = _provider_key(settings, name)
    if not key:
        return None
    if name == "openai":
        base, model, fmt = settings.openai_base_url, settings.openai_model, "openai"
    else:
        base, model, fmt = _DEFAULTS[name]
    return _Provider(name, base, settings.ai_model or model, key, fmt)


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


_ESCAPES = {'"': '"', "\\": "\\", "/": "/", "n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f"}


# Decode the JSON "reply" string out of a possibly-incomplete streamed response, so the
# human-readable text can be shown token-by-token while the rest of the JSON still arrives.
def _extract_reply(raw: str) -> str:
    key = raw.find('"reply"')
    if key < 0:
        return ""
    colon = raw.find(":", key + 7)
    if colon < 0:
        return ""
    i = colon + 1
    while i < len(raw) and raw[i] in " \t\r\n":
        i += 1
    if i >= len(raw) or raw[i] != '"':
        return ""
    i += 1
    out: list[str] = []
    while i < len(raw):
        ch = raw[i]
        if ch == "\\":
            if i + 1 >= len(raw):
                break  # incomplete escape at the stream edge
            nxt = raw[i + 1]
            if nxt == "u":
                if i + 6 > len(raw):
                    break
                with contextlib.suppress(ValueError):
                    out.append(chr(int(raw[i + 2 : i + 6], 16)))
                i += 6
                continue
            out.append(_ESCAPES.get(nxt, nxt))
            i += 2
            continue
        if ch == '"':
            break  # end of the reply value
        out.append(ch)
        i += 1
    return "".join(out)


class AssistantService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._studio = SimulationStudio()

    def _active(self) -> _Provider | None:
        chosen = (self._settings.ai_provider or "auto").lower()
        if chosen != "auto":
            return _resolve(self._settings, chosen)
        for name in _AUTO_ORDER:
            provider = _resolve(self._settings, name)
            if provider:
                return provider
        return None

    @property
    def configured(self) -> bool:
        return self._active() is not None

    def active_info(self) -> dict[str, Any]:
        provider = self._active()
        return {
            "configured": provider is not None,
            "provider": provider.name if provider else None,
            "model": provider.model if provider else None,
        }

    def available(self) -> dict[str, Any]:
        """Configured providers + their selectable models, for per-request switching."""
        providers: list[dict[str, Any]] = []
        for name in _AUTO_ORDER:
            if _provider_key(self._settings, name) is None:
                continue
            resolved = _resolve(self._settings, name)
            default_model = resolved.model if resolved else ""
            models = list(dict.fromkeys((default_model, *_MODELS.get(name, ()))))
            providers.append(
                {"name": name, "default_model": default_model, "models": [m for m in models if m]}
            )
        return {**self.active_info(), "providers": providers}

    def _resolve_named(self, name: str, model: str | None) -> _Provider | None:
        resolved = _resolve(self._settings, name)
        if resolved is None:
            return None
        return replace(resolved, model=model) if model else resolved

    def _select(self, name: str | None, model: str | None) -> _Provider | None:
        if name:
            return self._resolve_named(name.lower(), model)
        provider = self._active()
        if provider and model:
            return replace(provider, model=model)
        return provider

    def chat(
        self,
        messages: list[dict[str, str]],
        circuit: Circuit | None,
        provider_name: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        provider = self._select(provider_name, model)
        if provider is None:
            return {
                "reply": (
                    "The AI assistant isn't configured. Add a provider key to the backend .env "
                    "(GROQ_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY, OPEN_ROUTER_KEY, "
                    "OPENAI_API_KEY or ANTHROPIC_API_KEY); AI_PROVIDER defaults to 'auto'."
                ),
                "configured": False,
            }
        payload = self._build_messages(messages, circuit)
        try:
            content = self._complete(provider, payload)
        except httpx.HTTPError as exc:
            return {"reply": f"The {provider.name} request failed: {exc}", "configured": True}

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
    def _complete(self, provider: _Provider, messages: list[dict[str, str]]) -> str:
        if provider.fmt == "anthropic":
            return self._complete_anthropic(provider, messages)
        url = f"{provider.base_url.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {provider.key}"}
        if provider.name == "openrouter":
            headers["HTTP-Referer"] = "https://github.com/enjoys-in/circuitsim-3d"
            headers["X-Title"] = "CircuitSim"
        body: dict[str, Any] = {
            "model": provider.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 8000,
        }
        if provider.name == "groq" and "gpt-oss" in provider.model:
            # gpt-oss reasoning tokens count toward max_tokens; keep them small so the
            # JSON answer isn't truncated.
            body["reasoning_effort"] = "low"
        with httpx.Client(timeout=90.0) as client:
            res = client.post(url, headers=headers, json=body)
            res.raise_for_status()
            return res.json()["choices"][0]["message"].get("content") or ""

    def _complete_anthropic(self, provider: _Provider, messages: list[dict[str, str]]) -> str:
        system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
        convo = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
            if m["role"] != "system"
        ]
        url = f"{provider.base_url.rstrip('/')}/messages"
        headers = {
            "x-api-key": provider.key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": provider.model,
            "max_tokens": 3000,
            "temperature": 0.2,
            "system": system,
            "messages": convo,
        }
        with httpx.Client(timeout=60.0) as client:
            res = client.post(url, headers=headers, json=body)
            res.raise_for_status()
            parts = res.json().get("content", [])
            return "".join(b.get("text", "") for b in parts if b.get("type") == "text")

    # -- streaming ----------------------------------------------------------
    def _stream_complete(
        self, provider: _Provider, messages: list[dict[str, str]]
    ) -> Iterator[str]:
        if provider.fmt == "anthropic":
            # No incremental SSE parse for Anthropic — emit the whole reply as one chunk.
            yield self._complete_anthropic(provider, messages)
            return
        url = f"{provider.base_url.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {provider.key}"}
        if provider.name == "openrouter":
            headers["HTTP-Referer"] = "https://github.com/enjoys-in/circuitsim-3d"
            headers["X-Title"] = "CircuitSim"
        body: dict[str, Any] = {
            "model": provider.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 8000,
            "stream": True,
        }
        if provider.name == "groq" and "gpt-oss" in provider.model:
            body["reasoning_effort"] = "low"
        with httpx.Client(timeout=120.0) as client, client.stream(
            "POST", url, headers=headers, json=body
        ) as res:
            res.raise_for_status()
            for line in res.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                choices = chunk.get("choices") or []
                if not choices:
                    continue
                piece = (choices[0].get("delta") or {}).get("content")
                if piece:
                    yield piece

    def stream_chat(
        self,
        messages: list[dict[str, str]],
        circuit: Circuit | None,
        provider_name: str | None = None,
        model: str | None = None,
    ) -> Iterator[str]:
        provider = self._select(provider_name, model)
        if provider is None:
            yield _sse(
                "done",
                {
                    "reply": (
                        "The AI assistant isn't configured. Add a provider key to the backend "
                        ".env (GROQ_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY, OPEN_ROUTER_KEY, "
                        "OPENAI_API_KEY or ANTHROPIC_API_KEY); AI_PROVIDER defaults to 'auto'."
                    ),
                    "configured": False,
                    "circuit": None,
                    "issues": [],
                },
            )
            return
        payload = self._build_messages(messages, circuit)
        raw = ""
        emitted = ""
        try:
            for piece in self._stream_complete(provider, payload):
                raw += piece
                reply = _extract_reply(raw)
                if len(reply) > len(emitted):
                    yield _sse("token", {"text": reply[len(emitted):]})
                    emitted = reply
        except httpx.HTTPError as exc:
            yield _sse(
                "done",
                {
                    "reply": f"The {provider.name} request failed: {exc}",
                    "configured": True,
                    "circuit": None,
                    "issues": [],
                },
            )
            return
        yield _sse("done", self._finalize(raw))

    def _finalize(self, raw: str) -> dict[str, Any]:
        parsed = self._parse(raw)
        reply = str(parsed.get("reply") or "").strip() or "Done."
        design = parsed.get("design")
        if not isinstance(design, dict):
            return {"reply": reply, "configured": True, "circuit": None, "issues": []}
        try:
            built = self._studio.build_circuit(design.get("parts", []), design.get("wires", []))
        except Exception as exc:  # noqa: BLE001 - surface build errors to the user
            return {
                "reply": f"{reply}\n\n(Could not build that design: {exc})",
                "configured": True,
                "circuit": None,
                "issues": [],
            }
        self._layout(built)
        report = self._studio.validate(built)
        reply = self._with_result(reply, built, report)
        return {
            "reply": reply,
            "circuit": built.model_dump(mode="json"),
            "configured": True,
            "issues": report.get("issues", []),
        }

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
        text = content.strip()
        if text.startswith("```"):  # strip ```json ... ``` fences
            text = text.split("```")[1] if "```" in text[3:] else text[3:]
            if text.lower().startswith("json"):
                text = text[4:]
        # Reasoning models may wrap JSON in prose; fall back to the first {...} block.
        candidates = [text]
        start, end = text.find("{"), text.rfind("}")
        if start >= 0 and end > start:
            candidates.append(text[start : end + 1])
        for candidate in candidates:
            try:
                data = json.loads(candidate)
                if isinstance(data, dict):
                    return data
            except json.JSONDecodeError:
                continue
        return {"reply": content.strip()}

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
