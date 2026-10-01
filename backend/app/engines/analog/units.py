from __future__ import annotations

import re

_PREFIXES = {
    "p": 1e-12,
    "n": 1e-9,
    "u": 1e-6,
    "µ": 1e-6,
    "m": 1e-3,
    "": 1.0,
    "k": 1e3,
    "K": 1e3,
    "M": 1e6,
    "G": 1e9,
}

_PATTERN = re.compile(r"^\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*([pnuµmkKMG]?)")


def parse_si(value: object, default: float) -> float:
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, int | float):
        return float(value)
    match = _PATTERN.match(str(value)) if value is not None else None
    if not match:
        return default
    number, prefix = match.groups()
    return float(number) * _PREFIXES[prefix]


def param(params: dict[str, object], key: str, default: float) -> float:
    return parse_si(params.get(key, default), default)


def format_si(value: float, unit: str) -> str:
    magnitude = abs(value)
    for prefix, scale in (
        ("G", 1e9),
        ("M", 1e6),
        ("k", 1e3),
        ("", 1.0),
        ("m", 1e-3),
        ("µ", 1e-6),
        ("n", 1e-9),
    ):
        if magnitude >= scale:
            return f"{value / scale:.3g} {prefix}{unit}"
    return f"0 {unit}"
