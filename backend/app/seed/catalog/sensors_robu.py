"""Parametric sensor TYPES mapped from the robu.in catalog.

One editable entry per sensor family (not per SKU). Each carries a representative
`product_url` back to robu.in (stored in default_params; hidden from the value
editor on the frontend). Reading values (temperature, distance, ppm, ...) are
plain numeric params so they stay editable in the inspector.
"""
from __future__ import annotations

from app.domain.entities.component import ComponentCategory as C
from app.domain.entities.component import Pin
from app.seed.catalog.builder import Entry, P, component, pins

VENDOR = "robu.in"


def _analog() -> list[Pin]:
    return pins(("vcc", P.POWER), ("gnd", P.GROUND), ("out", P.OUTPUT))


def _digital() -> list[Pin]:
    return pins(("vcc", P.POWER), ("gnd", P.GROUND), ("out", P.OUTPUT))


def _i2c() -> list[Pin]:
    return pins(("vcc", P.POWER), ("gnd", P.GROUND), ("scl", P.INPUT), ("sda", P.BIDIRECTIONAL))


def _uart() -> list[Pin]:
    return pins(("vcc", P.POWER), ("gnd", P.GROUND), ("tx", P.OUTPUT), ("rx", P.INPUT))


def _trig_echo() -> list[Pin]:
    return pins(("vcc", P.POWER), ("gnd", P.GROUND), ("trig", P.INPUT), ("echo", P.OUTPUT))


def _spi() -> list[Pin]:
    return pins(
        ("vcc", P.POWER),
        ("gnd", P.GROUND),
        ("sck", P.INPUT),
        ("mosi", P.INPUT),
        ("miso", P.OUTPUT),
        ("ss", P.INPUT),
    )


def _two() -> list[Pin]:
    return pins(("a", P.PASSIVE), ("b", P.PASSIVE))


# key, name, subcategory, interface, reading params, robu link, description
_ROWS: list[tuple[str, str, str, "callable", dict[str, object], str, str]] = [
    # --- Climate / environment ---
    ("temp_humidity_sensor", "Temperature & Humidity Sensor", "environment", _digital,
     {"temperature": 25.0, "humidity": 50.0},
     "https://robu.in/product/waveshare-dht11-temperature-humidity-sensor/",
     "DHT-style single-wire temperature + relative humidity."),
    ("temperature_probe", "Temperature Probe (DS18B20)", "environment", _digital,
     {"temperature": 25.0},
     "https://robu.in/product/ds18b20-water-proof-temperature-probe-black-1m-2/",
     "Waterproof 1-Wire temperature probe."),
    ("thermocouple", "Thermocouple (K-Type)", "environment", _i2c,
     {"temperature": 200.0},
     "https://robu.in/product/surface-thermocouple-k-type-high-temperature-resistance-probe/",
     "High-temperature K-type thermocouple with amplifier."),
    ("thermistor_sensor", "Thermistor Module", "environment", _analog,
     {"temperature": 25.0, "resistance": 10000.0},
     "https://robu.in/product-category/thermistor-module/",
     "NTC thermistor; resistance falls as temperature rises."),
    ("barometer_sensor", "Barometric Pressure Sensor", "environment", _i2c,
     {"pressure": 1013.0, "temperature": 25.0},
     "https://robu.in/product-category/pressure-sensor/",
     "Atmospheric pressure + temperature over I2C."),
    ("soil_moisture_sensor", "Soil Moisture Sensor", "environment", _analog,
     {"moisture_pct": 40.0},
     "https://robu.in/product/soil-moisture-meter-soil-humidity-sensor-water-sensor-soil-hygrometer-ardunio/",
     "Capacitive/resistive soil moisture probe."),
    # --- Air quality ---
    ("gas_sensor", "Gas Sensor (MQ Series)", "air", _analog,
     {"ppm": 100.0},
     "https://robu.in/product-category/gas-sensor/",
     "MQ-family combustible/CO/air-quality gas sensor."),
    ("air_quality_sensor", "Air Quality Sensor (PM2.5)", "air", _uart,
     {"pm25": 35.0, "pm10": 50.0},
     "https://robu.in/product/nova-pm-sensor-sds011-high-precision-laser-pm2-5-air-quality-detection-sensor/",
     "Laser particulate (PM2.5 / PM10) dust sensor."),
    ("co2_sensor", "CO₂ Sensor", "air", _i2c,
     {"co2": 400.0},
     "https://robu.in/product-category/air-quality-sensor/",
     "NDIR / MOX carbon-dioxide concentration sensor."),
    # --- Liquid ---
    ("water_level_sensor", "Water Level Sensor", "liquid", _analog,
     {"level_pct": 50.0},
     "https://robu.in/product/dc5v-4-digital-water-liquid-level-indicator-module/",
     "Liquid level / water presence sensor."),
    ("flow_sensor", "Water Flow Sensor", "liquid", _digital,
     {"flow_lpm": 2.0},
     "https://robu.in/product/idod-g12-3-20lmin-flow-range-db-168-water-generator/",
     "Hall-effect turbine flow sensor (pulses per litre)."),
    ("ph_sensor", "pH Sensor", "liquid", _analog,
     {"ph": 7.0},
     "https://robu.in/product/liquid-ph-value-detection-sensor-for-arduino/",
     "Analog pH probe + signal-conditioning board."),
    # --- Light / optical ---
    ("light_sensor", "Light Sensor (Lux)", "light", _i2c,
     {"lux": 300.0},
     "https://robu.in/product/digital-ldr-module/",
     "Ambient light intensity in lux."),
    ("color_sensor", "Color Sensor", "light", _i2c,
     {"r": 128.0, "g": 128.0, "b": 128.0},
     "https://robu.in/product-category/light-color-sensor/",
     "RGB colour recognition sensor."),
    ("uv_sensor", "UV Sensor", "light", _analog,
     {"uv_index": 3.0},
     "https://robu.in/product-category/light-color-sensor/",
     "Ultraviolet intensity / UV index sensor."),
    # --- Presence / optical switches ---
    ("pir_sensor", "PIR Motion Sensor", "motion", _digital,
     {"motion": 0.0},
     "https://robu.in/product-category/ir-and-pir-sensor/",
     "Passive-infrared human motion detector (0/1)."),
    ("ir_obstacle_sensor", "IR Obstacle Sensor", "optical", _digital,
     {"detected": 0.0},
     "https://robu.in/product-category/ir-and-pir-sensor/",
     "Reflective IR obstacle / edge detector (0/1)."),
    ("photoelectric_sensor", "Photoelectric Sensor", "optical", _digital,
     {"detected": 0.0},
     "https://robu.in/product-category/photoelectric-sensor/",
     "Industrial through-beam / diffuse photoelectric sensor."),
    ("line_sensor", "Line Follower Sensor", "optical", _digital,
     {"line": 0.0},
     "https://robu.in/product-category/ir-and-pir-sensor/",
     "IR reflectance sensor for line following (0/1)."),
    # --- Distance / ranging ---
    ("ultrasonic_sensor", "Ultrasonic Distance Sensor", "distance", _trig_echo,
     {"distance_cm": 50.0},
     "https://robu.in/product/hc-sr04-ultrasonic-range-finder/",
     "HC-SR04 style trigger/echo ultrasonic ranger."),
    ("tof_distance_sensor", "ToF Distance Sensor", "distance", _i2c,
     {"distance_cm": 30.0},
     "https://robu.in/product-category/distance-sensor/",
     "Time-of-flight laser distance sensor (VL53L0X)."),
    ("ir_distance_sensor", "IR Distance Sensor (Sharp)", "distance", _analog,
     {"distance_cm": 20.0},
     "https://robu.in/product/sharp-ir-distance-measuring-sensor-unit-4-30-cm-cable/",
     "Analog IR triangulation distance sensor."),
    ("lidar_sensor", "LiDAR Sensor", "distance", _uart,
     {"distance_m": 1.0},
     "https://robu.in/product/rp-lidar-a3m1-360laser-range-scanner-25-meter-range/",
     "Scanning / single-point LiDAR rangefinder."),
    ("radar_sensor", "Radar / mmWave Sensor", "distance", _uart,
     {"distance_m": 2.0, "presence": 0.0},
     "https://robu.in/product-category/radar-sensor/",
     "mmWave presence / distance radar."),
    # --- Proximity ---
    ("inductive_proximity_sensor", "Inductive Proximity Sensor", "proximity", _digital,
     {"detected": 0.0},
     "https://robu.in/product/sn04-n-npn-no-5mm-distance-detector-proximity-sensor-switch-module/",
     "Detects nearby metal objects (0/1)."),
    ("capacitive_proximity_sensor", "Capacitive Proximity Sensor", "proximity", _digital,
     {"detected": 0.0},
     "https://robu.in/product-category/pro-range-capacitive-proximity-sensors/",
     "Detects conductive or dielectric objects (0/1)."),
    ("magnetic_switch", "Magnetic Reed Switch", "proximity", _two,
     {"closed": 0.0},
     "https://robu.in/product/mc-38-wired-door-window-sensor-magnetic-switch-home-alarm-system/",
     "Reed / door-window magnet switch (0 open, 1 closed)."),
    # --- Motion / orientation ---
    ("imu_sensor", "IMU (6-Axis)", "motion", _i2c,
     {"accel_x": 0.0, "accel_y": 0.0, "accel_z": 9.8, "gyro_x": 0.0, "gyro_y": 0.0, "gyro_z": 0.0},
     "https://robu.in/product-category/imu-accelerometer-magnetometer-and-gyroscope/",
     "Accelerometer + gyroscope inertial measurement unit."),
    ("accelerometer_sensor", "Accelerometer (3-Axis)", "motion", _i2c,
     {"accel_x": 0.0, "accel_y": 0.0, "accel_z": 9.8},
     "https://robu.in/product/sparkfun-triple-axis-accelerometer-breakout-lis3dh-sen-20659-with-headers/",
     "3-axis acceleration sensor."),
    ("hall_effect_sensor", "Hall Effect Sensor", "magnetic", _analog,
     {"field": 0.0},
     "https://robu.in/product/mcu-9911-ak09911c-geomagnetic-hall-sensor/",
     "Magnetic flux density (Hall effect)."),
    ("rotary_encoder_sensor", "Rotary Encoder", "motion", _digital,
     {"position": 0.0},
     "https://robu.in/product/sparkfun-roller-encoder-breakout-bob-29094/",
     "Incremental rotary encoder (counts / angle)."),
    ("tilt_sensor", "Tilt / Vibration Sensor", "motion", _digital,
     {"tilt": 0.0},
     "https://robu.in/product-category/vibration-tilt-sensor/",
     "Ball/mercury tilt and knock sensor (0/1)."),
    ("vibration_sensor", "Piezo Vibration Sensor", "motion", _analog,
     {"amplitude": 0.0},
     "https://robu.in/product/connectivity-sdt1e28091028k-shielded-piezo-film-sensor/",
     "Piezo film vibration / shock sensor."),
    # --- Force / load ---
    ("load_cell", "Load Cell + HX711", "force", _i2c,
     {"weight_g": 0.0},
     "https://robu.in/product/sop-soply-103-1t-load-cell-sensor-1-ton-capacity/",
     "Strain-gauge load cell with HX711 amplifier."),
    ("force_sensor", "Force Sensor (FSR)", "force", _two,
     {"force_n": 0.0},
     "https://robu.in/product-category/load-pressure-force-flex-sensor/",
     "Force-sensitive resistor; resistance drops under force."),
    ("flex_sensor", "Flex Sensor", "force", _two,
     {"bend_deg": 0.0},
     "https://robu.in/product/flex-sensor-2-2-bend-sensor-hand-gesture-recognition/",
     "Bend sensor; resistance rises as it flexes."),
    ("pressure_transducer", "Pressure Transducer", "force", _analog,
     {"pressure_bar": 0.0},
     "https://robu.in/product-category/pro-range-pressure-sensors/",
     "Industrial 4-20mA / analog pressure transducer."),
    # --- Electrical ---
    ("current_sensor", "Current Sensor (ACS712)", "electrical", _analog,
     {"current": 0.0},
     "https://robu.in/product/acs712-30a-range-current-sensor-module-hall-sensor/",
     "Hall-effect current sensor."),
    ("voltage_sensor", "Voltage Sensor", "electrical", _analog,
     {"voltage": 0.0},
     "https://robu.in/product-category/current-and-voltage-sensor/",
     "Resistive-divider DC voltage sensor."),
    # --- Sound / biometric / identification ---
    ("sound_sensor", "Sound Sensor", "sound", _analog,
     {"sound_db": 40.0},
     "https://robu.in/product-category/sound-sensor/",
     "Microphone sound-level sensor."),
    ("ecg_sensor", "ECG / Heart-Rate Sensor", "biometric", _analog,
     {"bpm": 72.0},
     "https://robu.in/product/sparkfun-single-lead-heart-rate-monitor-sensor-ad8232-ecg/",
     "Single-lead ECG / heart-rate monitor (AD8232)."),
    ("fingerprint_sensor", "Fingerprint Sensor", "biometric", _uart,
     {"match": 0.0},
     "https://robu.in/product/waveshare-uart-fingerprint-reader/",
     "Optical/capacitive fingerprint reader (0 no match)."),
    ("rfid_reader", "RFID Reader (RC522)", "identification", _spi,
     {"uid": 0.0},
     "https://robu.in/product/mifare-rfid-readerwriter-13-56mhz-rc522-spi-s50-fudan-card-and-keychain/",
     "13.56 MHz RFID/NFC card reader."),
]


def _build(row: tuple) -> Entry:
    key, name, sub, iface, params, url, desc = row
    default_params = {**params, "product_url": url, "vendor": VENDOR}
    return component(
        key,
        name,
        C.SENSOR,
        iface(),
        subcategory=sub,
        description=desc,
        default_params=default_params,
        tags=["sensor", "robu", sub],
    )


SENSORS_ROBU: list[Entry] = [_build(row) for row in _ROWS]
