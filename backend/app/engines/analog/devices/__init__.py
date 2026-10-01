from __future__ import annotations

from collections.abc import Callable

from app.domain.entities.project import ComponentInstance
from app.engines.analog.devices.base import Device, Resolver
from app.engines.analog.devices.passives import (
    Buzzer,
    Capacitor,
    Fan,
    Inductor,
    Ldr,
    Potentiometer,
    Relay,
    Resistor,
    Speaker,
    Switch,
)
from app.engines.analog.devices.semiconductors import Bjt, Diode, Led, Mosfet, RgbLed, Zener
from app.engines.analog.devices.sources import (
    Bms,
    Charger,
    Drive,
    Regulator,
    ShuntMonitor,
    VoltageSource,
)

DeviceFactory = Callable[[ComponentInstance, Resolver], Device]

DEVICE_FACTORIES: dict[str, DeviceFactory] = {
    "resistor": Resistor,
    "potentiometer": Potentiometer,
    "ldr": Ldr,
    "push_button": Switch,
    "push_button_nc": Switch,
    "toggle_switch": Switch,
    "dc_fan": Fan,
    "buzzer": Buzzer,
    "speaker": Speaker,
    "relay": Relay,
    "capacitor": Capacitor,
    "electrolytic_cap": lambda i, n: Capacitor(i, n, polarity=("+", "-")),
    "inductor": Inductor,
    "diode": Diode,
    "led": Led,
    "rgb_led": RgbLed,
    "zener_diode": Zener,
    "npn_bjt": lambda i, n: Bjt(i, n, npn=True),
    "pnp_bjt": lambda i, n: Bjt(i, n, npn=False),
    "nmos": lambda i, n: Mosfet(i, n, nmos=True),
    "pmos": lambda i, n: Mosfet(i, n, nmos=False),
    "dc_supply": VoltageSource,
    "battery_lipo": VoltageSource,
    "ldo_regulator": lambda i, n: Regulator(i, n, kind="ldo"),
    "buck_converter": lambda i, n: Regulator(i, n, kind="buck"),
    "boost_converter": lambda i, n: Regulator(i, n, kind="boost"),
    "tp4056_charger": Charger,
    "bms_1s": Bms,
    "ina219": ShuntMonitor,
}

SOURCE_KEYS = frozenset({"dc_supply", "battery_lipo"})
# Structural parts (e.g. breadboard) carry no device; they only provide connectivity.
STRUCTURAL_KEYS = frozenset({"breadboard_half"})
ANALOG_KEYS = frozenset(DEVICE_FACTORIES) | {"ground"} | STRUCTURAL_KEYS

__all__ = [
    "ANALOG_KEYS",
    "DEVICE_FACTORIES",
    "SOURCE_KEYS",
    "STRUCTURAL_KEYS",
    "Device",
    "Drive",
    "VoltageSource",
]
