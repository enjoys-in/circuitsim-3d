from __future__ import annotations

from app.domain.entities.component import ComponentCategory
from app.seed.catalog.builder import Entry, P, component, pins

# Connectivity-only parts: pins are wired by the user; no internal device behaviour.
CONNECTORS: list[Entry] = [
    component(
        "header_male_1x2",
        "Male Header 1x2",
        ComponentCategory.CONNECTOR,
        pins(("1", P.PASSIVE), ("2", P.PASSIVE)),
        subcategory="header",
        description="2-pin 2.54mm male pin header / jumper",
        tags=["header", "jumper", "male", "2.54mm"],
    ),
    component(
        "header_male_1x4",
        "Male Header 1x4",
        ComponentCategory.CONNECTOR,
        pins(("1", P.PASSIVE), ("2", P.PASSIVE), ("3", P.PASSIVE), ("4", P.PASSIVE)),
        subcategory="header",
        description="4-pin 2.54mm male pin header",
        tags=["header", "jumper", "male", "2.54mm"],
    ),
    component(
        "header_female_1x4",
        "Female Header 1x4",
        ComponentCategory.CONNECTOR,
        pins(("1", P.PASSIVE), ("2", P.PASSIVE), ("3", P.PASSIVE), ("4", P.PASSIVE)),
        subcategory="header",
        description="4-pin 2.54mm female socket header",
        tags=["header", "socket", "female", "2.54mm"],
    ),
    component(
        "usb_a",
        "USB-A",
        ComponentCategory.CONNECTOR,
        pins(
            ("VBUS", P.POWER),
            ("D-", P.BIDIRECTIONAL),
            ("D+", P.BIDIRECTIONAL),
            ("GND", P.GROUND),
        ),
        subcategory="usb",
        description="USB Type-A receptacle (5 V, D+/D-)",
        tags=["usb", "usb-a"],
    ),
    component(
        "usb_b",
        "USB-B",
        ComponentCategory.CONNECTOR,
        pins(
            ("VBUS", P.POWER),
            ("D-", P.BIDIRECTIONAL),
            ("D+", P.BIDIRECTIONAL),
            ("GND", P.GROUND),
        ),
        subcategory="usb",
        description="USB Type-B receptacle (5 V, D+/D-)",
        tags=["usb", "usb-b"],
    ),
    component(
        "usb_c",
        "USB-C",
        ComponentCategory.CONNECTOR,
        pins(
            ("VBUS", P.POWER),
            ("GND", P.GROUND),
            ("D+", P.BIDIRECTIONAL),
            ("D-", P.BIDIRECTIONAL),
            ("CC", P.PASSIVE),
        ),
        subcategory="usb",
        description="USB Type-C receptacle (VBUS, GND, D+/D-, CC)",
        tags=["usb", "usb-c", "type-c"],
    ),
]
