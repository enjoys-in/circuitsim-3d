"""On-demand vendor catalog backed by the scraped robu.in data.

Serves the scraped products for browse/search so the UI can import a component
only when the user asks for it, instead of seeding thousands of parts up front.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "robu"
_MAX_NAME = 80

# Top-level scrape category -> placeable component category.
_TOP_TO_CATEGORY: dict[str, str] = {
    "sensor-modules": "sensor",
    "electronic-components": "passive",
    "electronic-modules": "sensor",
    "microcontroller-development-board": "dev_board",
    "iot-and-wireless": "sensor",
    "dc-motors": "actuator",
    "batteries": "power",
    "ebike-parts": "power",
}


def _pin(name: str, direction: str, index: int) -> dict[str, Any]:
    return {"name": name, "direction": direction, "x": 0.0, "y": float(index)}


def _pins(*specs: tuple[str, str]) -> list[dict[str, Any]]:
    return [_pin(name, direction, i) for i, (name, direction) in enumerate(specs)]


_I2C = _pins(("vcc", "power"), ("gnd", "ground"), ("scl", "input"), ("sda", "bidirectional"))
_UART = _pins(("vcc", "power"), ("gnd", "ground"), ("tx", "output"), ("rx", "input"))
_TRIG_ECHO = _pins(("vcc", "power"), ("gnd", "ground"), ("trig", "input"), ("echo", "output"))
_ANALOG = _pins(("vcc", "power"), ("gnd", "ground"), ("out", "output"))
_TWO = _pins(("a", "passive"), ("b", "passive"))
_POLAR = _pins(("+", "power"), ("-", "ground"))
_ACTUATOR = _pins(("in", "input"), ("+", "power"), ("-", "ground"))


def _infer_pins(text: str, category: str) -> list[dict[str, Any]]:
    t = text.lower()
    if category == "passive":
        return _TWO
    if category == "power":
        return _POLAR
    if "ultrasonic" in t:
        return _TRIG_ECHO
    if any(
        k in t
        for k in ("i2c", "imu", "oled", "lcd", "bme", "mpu", "gyro", "magnet", "rtc", "accelerom")
    ):
        return _I2C
    if any(k in t for k in ("uart", "gps", "fingerprint", "serial", "lidar", "lora", "zigbee")):
        return _UART
    if category == "actuator" or any(k in t for k in ("motor", "relay", "pump", "servo", "fan")):
        return _ACTUATOR
    return _ANALOG


class VendorCatalogService:
    @property
    def available(self) -> bool:
        return (_DATA_DIR / "products.json").exists()

    def _products(self) -> list[dict[str, Any]]:
        return _load_products()

    def categories(self) -> dict[str, Any]:
        counts: dict[str, int] = {}
        for product in self._products():
            for name in product.get("categories") or []:
                counts[name] = counts.get(name, 0) + 1
        categories = [
            {"name": name, "count": count}
            for name, count in sorted(counts.items(), key=lambda kv: -kv[1])
        ]
        return {
            "available": self.available,
            "total": len(self._products()),
            "categories": categories,
        }

    def search(
        self, *, category: str | None, query: str | None, page: int, page_size: int
    ) -> dict[str, Any]:
        needle = (query or "").strip().lower()
        wanted = (category or "").strip().lower()
        matched: list[dict[str, Any]] = []
        for product in self._products():
            if wanted and not any(wanted == c.lower() for c in product.get("categories") or []):
                continue
            if needle and needle not in str(product.get("name", "")).lower():
                continue
            matched.append(product)
        total = len(matched)
        start = max(page - 1, 0) * page_size
        items = matched[start : start + page_size]
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": max(1, (total + page_size - 1) // page_size),
        }

    def get(self, product_id: str) -> dict[str, Any] | None:
        for product in self._products():
            if str(product.get("id")) == str(product_id):
                return product
        return None

    def to_component(self, product: dict[str, Any]) -> dict[str, Any]:
        """Build catalog-component fields from a scraped product (best-effort pins)."""
        sources = product.get("source_categories") or []
        category = next((_TOP_TO_CATEGORY[s] for s in sources if s in _TOP_TO_CATEGORY), "sensor")
        leaves = product.get("categories") or []
        text = f"{product.get('name', '')} {' '.join(leaves)}"
        name = str(product.get("name") or "Component").strip()
        key = f"robu_{re.sub(r'[^a-z0-9]+', '_', str(product.get('id'))).strip('_')}"
        params: dict[str, Any] = {
            "product_url": product.get("url"),
            "vendor": "robu.in",
        }
        if product.get("image"):
            params["image"] = product["image"]
        if product.get("sku"):
            params["sku"] = product["sku"]
        if product.get("price") is not None:
            params["price"] = product["price"]
        return {
            "key": key,
            "name": name[:_MAX_NAME],
            "category": category,
            "subcategory": leaves[0] if leaves else None,
            "description": ", ".join(leaves)[:200],
            "pins": _infer_pins(text, category),
            "default_params": params,
            "tags": ["robu", "import", *sources],
        }


@lru_cache(maxsize=1)
def _load_products() -> list[dict[str, Any]]:
    path = _DATA_DIR / "products.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []
