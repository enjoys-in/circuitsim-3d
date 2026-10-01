from __future__ import annotations

from app.domain.entities.component import ComponentCategory, Pin, PinDirection

P = PinDirection
Entry = dict[str, object]


def pins(*specs: tuple[str, PinDirection]) -> list[Pin]:
    return [
        Pin(name=name, direction=direction, x=0.0, y=float(i))
        for i, (name, direction) in enumerate(specs)
    ]


def component(
    key: str,
    name: str,
    category: ComponentCategory,
    pin_list: list[Pin],
    *,
    subcategory: str | None = None,
    description: str = "",
    default_params: dict[str, object] | None = None,
    tags: list[str] | None = None,
) -> Entry:
    return {
        "key": key,
        "name": name,
        "category": category.value,
        "subcategory": subcategory,
        "description": description,
        "pins": [p.model_dump(mode="json") for p in pin_list],
        "default_params": default_params or {},
        "tags": tags or [],
    }
