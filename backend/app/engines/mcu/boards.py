from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BoardProfile:
    name: str
    mcu: str
    logic_voltage: float
    adc_max: int
    supplies: dict[str, float]
    grounds: tuple[str, ...]
    gpio: tuple[str, ...]
    pin_prefix: str
    onboard_led: str | None
    i2c: tuple[str, str]
    max_pin_current: float = 0.04

    def resolve(self, pin: object) -> str | None:
        name = f"{self.pin_prefix}{pin}" if isinstance(pin, int) else str(pin).strip().lower()
        return name if name in self.gpio else None

    @property
    def pins(self) -> tuple[str, ...]:
        return (*self.supplies, *self.grounds, *self.gpio)


def _range(prefix: str, numbers: range | list[int]) -> tuple[str, ...]:
    return tuple(f"{prefix}{n}" for n in numbers)


BOARD_PROFILES: dict[str, BoardProfile] = {
    "esp32_devkit": BoardProfile(
        name="ESP32 DevKit",
        mcu="esp32",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "vin": 5.0},
        grounds=("gnd",),
        gpio=_range(
            "gpio",
            [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35],
        ),
        pin_prefix="gpio",
        onboard_led="gpio2",
        i2c=("gpio21", "gpio22"),
    ),
    "esp8266": BoardProfile(
        name="ESP8266 NodeMCU",
        mcu="esp8266",
        logic_voltage=3.3,
        adc_max=1023,
        supplies={"3v3": 3.3, "vin": 5.0},
        grounds=("gnd",),
        gpio=("a0", *_range("d", range(9))),
        pin_prefix="d",
        onboard_led="d4",
        i2c=("d2", "d1"),
        max_pin_current=0.012,
    ),
    "arduino_uno": BoardProfile(
        name="Arduino Uno",
        mcu="atmega328p",
        logic_voltage=5.0,
        adc_max=1023,
        supplies={"5v": 5.0, "3v3": 3.3},
        grounds=("gnd",),
        gpio=(*_range("a", range(6)), *_range("d", range(2, 14))),
        pin_prefix="d",
        onboard_led="d13",
        i2c=("a4", "a5"),
    ),
    "stm32_bluepill": BoardProfile(
        name="STM32 Blue Pill",
        mcu="stm32f103",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "5v": 5.0},
        grounds=("gnd",),
        gpio=(*_range("pa", range(8)), *_range("pb", [6, 7, 8, 9]), "pc13"),
        pin_prefix="pa",
        onboard_led="pc13",
        i2c=("pb7", "pb6"),
        max_pin_current=0.025,
    ),
    "rp2040_pico": BoardProfile(
        name="Raspberry Pi Pico",
        mcu="rp2040",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "vsys": 5.0},
        grounds=("gnd",),
        gpio=_range("gp", [*range(23), 25, 26, 27, 28]),
        pin_prefix="gp",
        onboard_led="gp25",
        i2c=("gp4", "gp5"),
        max_pin_current=0.012,
    ),
}

BOARD_KEYS = frozenset(BOARD_PROFILES)
