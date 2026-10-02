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


# Standard Raspberry-Pi-style 40-pin header GPIO (BCM numbering), shared by most SBCs.
_PI_GPIO = _range(
    "gpio",
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
)


def _sbc(name: str, soc: str) -> "BoardProfile":
    """A Linux single-board computer modelled by its 40-pin GPIO header."""
    return BoardProfile(
        name=name,
        mcu=soc,
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "5v": 5.0},
        grounds=("gnd",),
        gpio=_PI_GPIO,
        pin_prefix="gpio",
        onboard_led=None,
        i2c=("gpio3", "gpio2"),
        max_pin_current=0.016,
    )


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
    # --- more ESP32 family ---
    "esp32_s2": BoardProfile(
        name="ESP32-S2 Saola",
        mcu="esp32-s2",
        logic_voltage=3.3,
        adc_max=8191,
        supplies={"3v3": 3.3, "vin": 5.0},
        grounds=("gnd",),
        gpio=_range("gpio", [*range(1, 22), *range(33, 41)]),
        pin_prefix="gpio",
        onboard_led="gpio18",
        i2c=("gpio9", "gpio8"),
    ),
    "esp32_s3": BoardProfile(
        name="ESP32-S3 DevKit",
        mcu="esp32-s3",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "vin": 5.0},
        grounds=("gnd",),
        gpio=_range("gpio", [*range(1, 22), *range(35, 49)]),
        pin_prefix="gpio",
        onboard_led="gpio48",
        i2c=("gpio9", "gpio8"),
    ),
    "esp32_c3": BoardProfile(
        name="ESP32-C3 SuperMini",
        mcu="esp32-c3",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "vin": 5.0},
        grounds=("gnd",),
        gpio=_range("gpio", [*range(0, 11), *range(18, 22)]),
        pin_prefix="gpio",
        onboard_led="gpio8",
        i2c=("gpio9", "gpio10"),
        max_pin_current=0.012,
    ),
    "esp32_c6": BoardProfile(
        name="ESP32-C6 DevKit",
        mcu="esp32-c6",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "vin": 5.0},
        grounds=("gnd",),
        gpio=_range("gpio", list(range(0, 31))),
        pin_prefix="gpio",
        onboard_led="gpio8",
        i2c=("gpio7", "gpio6"),
    ),
    "esp32_cam": BoardProfile(
        name="ESP32-CAM",
        mcu="esp32",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"5v": 5.0, "3v3": 3.3},
        grounds=("gnd",),
        gpio=_range("gpio", [0, 1, 2, 3, 4, 12, 13, 14, 15, 16]),
        pin_prefix="gpio",
        onboard_led="gpio4",
        i2c=("gpio15", "gpio14"),
    ),
    # --- more Arduino family ---
    "arduino_nano": BoardProfile(
        name="Arduino Nano",
        mcu="atmega328p",
        logic_voltage=5.0,
        adc_max=1023,
        supplies={"5v": 5.0, "3v3": 3.3},
        grounds=("gnd",),
        gpio=(*_range("a", range(8)), *_range("d", range(2, 14))),
        pin_prefix="d",
        onboard_led="d13",
        i2c=("a5", "a4"),
    ),
    "arduino_mini": BoardProfile(
        name="Arduino Pro Mini",
        mcu="atmega328p",
        logic_voltage=5.0,
        adc_max=1023,
        supplies={"vcc": 5.0, "raw": 9.0},
        grounds=("gnd",),
        gpio=(*_range("a", range(8)), *_range("d", range(2, 14))),
        pin_prefix="d",
        onboard_led="d13",
        i2c=("a5", "a4"),
    ),
    "arduino_mega": BoardProfile(
        name="Arduino Mega 2560",
        mcu="atmega2560",
        logic_voltage=5.0,
        adc_max=1023,
        supplies={"5v": 5.0, "3v3": 3.3},
        grounds=("gnd",),
        gpio=(*_range("a", range(16)), *_range("d", range(2, 22))),
        pin_prefix="d",
        onboard_led="d13",
        i2c=("d21", "d20"),
    ),
    "arduino_leonardo": BoardProfile(
        name="Arduino Leonardo",
        mcu="atmega32u4",
        logic_voltage=5.0,
        adc_max=1023,
        supplies={"5v": 5.0, "3v3": 3.3},
        grounds=("gnd",),
        gpio=(*_range("a", range(6)), *_range("d", range(2, 14))),
        pin_prefix="d",
        onboard_led="d13",
        i2c=("d3", "d2"),
    ),
    "arduino_micro": BoardProfile(
        name="Arduino Micro",
        mcu="atmega32u4",
        logic_voltage=5.0,
        adc_max=1023,
        supplies={"5v": 5.0, "3v3": 3.3},
        grounds=("gnd",),
        gpio=(*_range("a", range(6)), *_range("d", range(2, 14))),
        pin_prefix="d",
        onboard_led="d13",
        i2c=("d3", "d2"),
    ),
    # --- more STM32 / RP2040 / Teensy ---
    "stm32_blackpill": BoardProfile(
        name="STM32 Black Pill",
        mcu="stm32f411",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "5v": 5.0},
        grounds=("gnd",),
        gpio=(*_range("pa", range(16)), *_range("pb", range(11)), "pc13"),
        pin_prefix="pa",
        onboard_led="pc13",
        i2c=("pb8", "pb9"),
        max_pin_current=0.025,
    ),
    "rp2040_pico_w": BoardProfile(
        name="Raspberry Pi Pico W",
        mcu="rp2040",
        logic_voltage=3.3,
        adc_max=4095,
        supplies={"3v3": 3.3, "vsys": 5.0},
        grounds=("gnd",),
        gpio=_range("gp", [*range(23), 26, 27, 28]),
        pin_prefix="gp",
        onboard_led=None,
        i2c=("gp5", "gp4"),
        max_pin_current=0.012,
    ),
    "teensy40": BoardProfile(
        name="Teensy 4.0",
        mcu="imxrt1062",
        logic_voltage=3.3,
        adc_max=1023,
        supplies={"3v3": 3.3, "vin": 5.0},
        grounds=("gnd",),
        gpio=_range("d", range(24)),
        pin_prefix="d",
        onboard_led="d13",
        i2c=("d19", "d18"),
        max_pin_current=0.01,
    ),
    # --- single-board computers (Linux GPIO headers) ---
    "raspberry_pi_zero": _sbc("Raspberry Pi Zero 2 W", "bcm2710"),
    "raspberry_pi_3": _sbc("Raspberry Pi 3 Model B+", "bcm2837"),
    "raspberry_pi_4": _sbc("Raspberry Pi 4", "bcm2711"),
    "raspberry_pi_5": _sbc("Raspberry Pi 5", "bcm2712"),
    "orange_pi_zero": _sbc("Orange Pi Zero 3", "allwinner-h618"),
    "orange_pi_5": _sbc("Orange Pi 5", "rockchip-rk3588s"),
    "banana_pi_m2": _sbc("Banana Pi M2 Zero", "allwinner-h3"),
    "radxa_rock5": _sbc("Radxa Rock 5B", "rockchip-rk3588"),
    "radxa_zero": _sbc("Radxa Zero", "allwinner-h616"),
    "beaglebone_black": _sbc("BeagleBone Black", "ti-am335x"),
    "jetson_nano": _sbc("NVIDIA Jetson Nano", "tegra-x1"),
    "milkv_duo": _sbc("Milk-V Duo (RISC-V)", "sophgo-cv1800b"),
    "milkv_mars": _sbc("Milk-V Mars (RISC-V)", "starfive-jh7110"),
}

BOARD_KEYS = frozenset(BOARD_PROFILES)
