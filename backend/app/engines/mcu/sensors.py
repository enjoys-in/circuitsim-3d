from __future__ import annotations

from dataclasses import dataclass

from app.engines.analog.units import param


@dataclass(frozen=True, slots=True)
class Quantity:
    unit: str
    default: float
    resolution: float


@dataclass(frozen=True, slots=True)
class SensorModel:
    name: str
    bus: str
    bus_pins: tuple[str, ...]
    quantities: dict[str, Quantity]
    min_voltage: float = 1.7

    def value(self, params: dict[str, object], quantity: str, progress: float) -> float:
        spec = self.quantities[quantity]
        start = param(params, quantity, spec.default)
        end = param(params, f"{quantity}_end", start)
        raw = start + (end - start) * progress
        steps = round(raw / spec.resolution)
        return round(steps * spec.resolution, 6)

    def defaults(self) -> dict[str, float]:
        return {name: q.default for name, q in self.quantities.items()}


_TEMPERATURE = Quantity("°C", 25.0, 0.01)

SENSOR_MODELS: dict[str, SensorModel] = {
    "bme280": SensorModel(
        name="BME280",
        bus="i2c",
        bus_pins=("sda", "scl"),
        quantities={
            "temperature": _TEMPERATURE,
            "humidity": Quantity("%", 45.0, 0.01),
            "pressure": Quantity("hPa", 1013.25, 0.01),
        },
    ),
    "mpu6050": SensorModel(
        name="MPU6050",
        bus="i2c",
        bus_pins=("sda", "scl"),
        quantities={
            "accel_x": Quantity("m/s²", 0.0, 0.01),
            "accel_y": Quantity("m/s²", 0.0, 0.01),
            "accel_z": Quantity("m/s²", 9.81, 0.01),
            "gyro_x": Quantity("°/s", 0.0, 0.01),
            "gyro_y": Quantity("°/s", 0.0, 0.01),
            "gyro_z": Quantity("°/s", 0.0, 0.01),
            "temperature": _TEMPERATURE,
        },
        min_voltage=2.3,
    ),
    "dht22": SensorModel(
        name="DHT22",
        bus="1wire",
        bus_pins=("data",),
        quantities={
            "temperature": Quantity("°C", 25.0, 0.1),
            "humidity": Quantity("%", 50.0, 0.1),
        },
        min_voltage=3.0,
    ),
    "ds18b20": SensorModel(
        name="DS18B20",
        bus="1wire",
        bus_pins=("data",),
        quantities={"temperature": Quantity("°C", 25.0, 0.0625)},
        min_voltage=3.0,
    ),
    "gps_neo6m": SensorModel(
        name="NEO-6M",
        bus="uart",
        bus_pins=("tx",),
        quantities={
            "latitude": Quantity("°", 28.6139, 1e-6),
            "longitude": Quantity("°", 77.209, 1e-6),
            "altitude": Quantity("m", 216.0, 0.1),
            "speed": Quantity("km/h", 0.0, 0.1),
            "satellites": Quantity("", 8, 1),
        },
        min_voltage=2.7,
    ),
    "hall_sensor": SensorModel(
        name="Hall sensor",
        bus="digital",
        bus_pins=("out",),
        quantities={"field": Quantity("mT", 0.0, 0.1)},
        min_voltage=3.0,
    ),
}

SENSOR_KEYS = frozenset(SENSOR_MODELS)
HALL_TRIGGER_MT = 5.0
