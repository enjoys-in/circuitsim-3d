from __future__ import annotations

from app.domain.entities.component import ComponentCategory as C
from app.domain.entities.component import Pin
from app.engines.mcu.boards import BOARD_PROFILES, BoardProfile
from app.engines.mcu.sensors import SENSOR_MODELS
from app.seed.catalog.builder import Entry, P, component, pins

I2C = pins(("vcc", P.POWER), ("gnd", P.GROUND), ("scl", P.INPUT), ("sda", P.BIDIRECTIONAL))
ONE_WIRE = pins(("vcc", P.POWER), ("data", P.BIDIRECTIONAL), ("gnd", P.GROUND))

_SENSOR_META: list[tuple[str, str, list[Pin], str, dict[str, object]]] = [
    ("bme280", "BME280 (T/H/P)", I2C, "environment", {"bus": "i2c", "i2c_addr": "0x76"}),
    ("mpu6050", "MPU6050 IMU", I2C, "motion", {"bus": "i2c", "i2c_addr": "0x68"}),
    ("dht22", "DHT22 Temp/Humidity", ONE_WIRE, "environment", {"bus": "1wire"}),
    ("ds18b20", "DS18B20 Temperature", ONE_WIRE, "environment", {"bus": "1wire"}),
    (
        "hall_sensor",
        "Hall Effect Sensor",
        pins(("vcc", P.POWER), ("out", P.OUTPUT), ("gnd", P.GROUND)),
        "magnetic",
        {},
    ),
    (
        "gps_neo6m",
        "NEO-6M GPS",
        pins(("vcc", P.POWER), ("gnd", P.GROUND), ("tx", P.OUTPUT), ("rx", P.INPUT)),
        "position",
        {"bus": "uart"},
    ),
]

SENSORS: list[Entry] = [
    component(
        key,
        name,
        C.SENSOR,
        pin_list,
        subcategory=sub,
        tags=["iot"],
        default_params={**extra, **SENSOR_MODELS[key].defaults()},
    )
    for key, name, pin_list, sub, extra in _SENSOR_META
]
SENSORS.append(
    component(
        "ldr",
        "LDR (Photoresistor)",
        C.SENSOR,
        pins(("a", P.PASSIVE), ("b", P.PASSIVE)),
        subcategory="light",
        default_params={"lux": 100},
    )
)


def default_firmware(profile: BoardProfile) -> str:
    led = profile.onboard_led or profile.gpio[0]
    fan = profile.gpio[-3]
    return (
        "# Runs once every tick. Variables keep their values between ticks.\n"
        f'digital_write("{led}", tick % 2)\n'
        "\n"
        'temperature = read("bme280", "temperature")\n'
        "if temperature is not None:\n"
        '    print(f"temperature = {temperature:.1f} C")\n'
        f'    digital_write("{fan}", HIGH if temperature > 30 else LOW)\n'
    )


def _board_pins(profile: BoardProfile) -> list[Pin]:
    specs = [
        *((pin, P.POWER) for pin in profile.supplies),
        *((pin, P.GROUND) for pin in profile.grounds),
        *((pin, P.BIDIRECTIONAL) for pin in profile.gpio),
    ]
    return pins(*specs)


BOARDS: list[Entry] = [
    component(
        key,
        profile.name,
        C.DEV_BOARD,
        _board_pins(profile),
        subcategory="mcu",
        description=f"{profile.mcu.upper()} at {profile.logic_voltage} V logic, I2C on "
        f"{profile.i2c[0].upper()}/{profile.i2c[1].upper()}",
        default_params={"mcu": profile.mcu, "firmware": default_firmware(profile)},
        tags=["iot"],
    )
    for key, profile in BOARD_PROFILES.items()
]

I2C_DISPLAY = pins(
    ("vcc", P.POWER), ("gnd", P.GROUND), ("scl", P.INPUT), ("sda", P.BIDIRECTIONAL)
)

# Firmware-controlled peripherals (driven by servo_write / display_print).
PERIPHERALS: list[Entry] = [
    component(
        "servo_sg90",
        "SG90 Servo",
        C.ACTUATOR,
        pins(("vcc", P.POWER), ("gnd", P.GROUND), ("signal", P.INPUT)),
        subcategory="motor",
        description="Hobby servo; set the angle with servo_write(pin, 0-180)",
        default_params={"angle": 90},
        tags=["iot"],
    ),
    component(
        "oled_ssd1306",
        "OLED SSD1306",
        C.ACTUATOR,
        I2C_DISPLAY,
        subcategory="display",
        description="128x64 I2C display; write with display_print(text)",
        default_params={"bus": "i2c", "i2c_addr": "0x3C", "width": 128, "height": 64},
        tags=["iot"],
    ),
    component(
        "lcd1602_i2c",
        "16x2 LCD (I2C)",
        C.ACTUATOR,
        I2C_DISPLAY,
        subcategory="display",
        description="16x2 character LCD over I2C; write with display_print(text)",
        default_params={"bus": "i2c", "i2c_addr": "0x27"},
        tags=["iot"],
    ),
]
