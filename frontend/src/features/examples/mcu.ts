import { build, type Example } from "./build";

const BLINK = `# Toggle the onboard LED every tick
digital_write("gpio2", tick % 2)
`;

const THERMOSTAT = `# Blink onboard LED and switch a fan above 30 C
digital_write("gpio2", tick % 2)

t = read("bme280", "temperature")
if t is not None:
    print(f"T = {t:.1f} C")
    hot = t > 30
    digital_write("gpio23", HIGH if hot else LOW)
    digital_write("gpio33", HIGH if hot else LOW)
`;

const BUTTON_LED = `# Mirror a pulled-up button onto an LED
pin_mode("gpio4", INPUT_PULLUP)
pressed = digital_read("gpio4") == 0
digital_write("gpio23", HIGH if pressed else LOW)
print("pressed" if pressed else "idle")
`;

const NIGHT_LIGHT = `# Read the LDR divider and light the LED when it is dark
level = analog_read("gpio34")
print(f"light = {level}")
digital_write("gpio23", HIGH if level < 1800 else LOW)
`;

const OLED_WEATHER = `# Show BME280 readings on an I2C OLED
t = read("bme280", "temperature")
h = read("bme280", "humidity")
display_clear()
display_print("Weather Station")
if t is not None:
    display_print(f"Temp: {t:.1f} C")
if h is not None:
    display_print(f"Hum:  {h:.0f} %")
`;

const SERVO_SWEEP = `# Sweep a servo back and forth each tick
angle = (tick * 20) % 360
if angle > 180:
    angle = 360 - angle
servo_write("gpio13", angle)
print(f"angle = {angle}")
`;

const PI_GPIO_LED = `# Blink an LED on BCM GPIO17 (RPi.GPIO / gpiozero style)
digital_write("gpio17", tick % 2)
print("on" if tick % 2 else "off")
`;

const S3_BLINK = `# ESP32-S3: blink the onboard RGB LED and an external LED
digital_write("gpio48", tick % 2)
digital_write("gpio5", tick % 2)
`;

export const MCU_EXAMPLES: Example[] = [
  {
    id: "esp32-blink",
    title: "ESP32 blink",
    category: "MCU",
    description: "The classic — toggle the onboard LED each tick",
    circuit: build([["MCU1", "esp32_devkit", 0, 0, { firmware: BLINK }]], []),
    options: { ticks: 16, tick_ms: 400 },
  },
  {
    id: "esp32-thermostat",
    title: "ESP32 thermostat",
    category: "MCU",
    description: "BME280 warms 22→38 °C; firmware drives a fan through an NPN",
    circuit: build(
      [
        ["MCU1", "esp32_devkit", 0, 0, { firmware: THERMOSTAT }],
        ["BME280", "bme280", 300, -10, { temperature: 22, temperature_end: 38 }],
        ["R1", "resistor", 260, 150, { resistance: 220 }],
        ["LED1", "led", 410, 120, { color: "yellow" }],
        ["R2", "resistor", 260, 260, { resistance: 1000 }],
        ["Q1", "npn_bjt", 410, 240],
        ["M1", "dc_fan", 540, 210],
      ],
      [
        ["MCU1:3v3", "BME280:vcc"],
        ["MCU1:gnd", "BME280:gnd"],
        ["MCU1:gpio21", "BME280:sda"],
        ["MCU1:gpio22", "BME280:scl"],
        ["MCU1:gpio23", "R1:a"],
        ["R1:b", "LED1:anode"],
        ["LED1:cathode", "MCU1:gnd"],
        ["MCU1:gpio33", "R2:a"],
        ["R2:b", "Q1:base"],
        ["Q1:emitter", "MCU1:gnd"],
        ["Q1:collector", "M1:-"],
        ["M1:+", "MCU1:vin"],
      ],
    ),
    options: { ticks: 24, tick_ms: 500 },
  },
  {
    id: "esp32-button",
    title: "ESP32 button + LED",
    category: "MCU",
    description: "Firmware reads a pulled-up button and mirrors it to an LED",
    circuit: build(
      [
        ["MCU1", "esp32_devkit", 0, 0, { firmware: BUTTON_LED }],
        ["SW1", "push_button", 300, 20, { pressed: 1 }],
        ["R1", "resistor", 300, 180, { resistance: 220 }],
        ["LED1", "led", 450, 150, { color: "green" }],
      ],
      [
        ["MCU1:gpio4", "SW1:a"],
        ["SW1:b", "MCU1:gnd"],
        ["MCU1:gpio23", "R1:a"],
        ["R1:b", "LED1:anode"],
        ["LED1:cathode", "MCU1:gnd"],
      ],
    ),
    options: { ticks: 12, tick_ms: 400 },
  },
  {
    id: "esp32-nightlight",
    title: "ESP32 LDR night light",
    category: "MCU",
    description: "ADC reads an LDR divider; the LED comes on when it gets dark",
    circuit: build(
      [
        ["MCU1", "esp32_devkit", 0, 0, { firmware: NIGHT_LIGHT }],
        ["LDR1", "ldr", 300, 20, { lux: 400, lux_end: 5 }],
        ["R1", "resistor", 300, 160, { resistance: 10000 }],
        ["R2", "resistor", 470, 250, { resistance: 220 }],
        ["LED1", "led", 610, 220, { color: "white" }],
      ],
      [
        ["MCU1:3v3", "LDR1:a"],
        ["LDR1:b", "MCU1:gpio34"],
        ["LDR1:b", "R1:a"],
        ["R1:b", "MCU1:gnd"],
        ["MCU1:gpio23", "R2:a"],
        ["R2:b", "LED1:anode"],
        ["LED1:cathode", "MCU1:gnd"],
      ],
    ),
    options: { ticks: 20, tick_ms: 400 },
  },
  {
    id: "esp32-oled-weather",
    title: "ESP32 OLED weather",
    category: "MCU",
    description: "BME280 over I2C printed to an SSD1306 OLED",
    circuit: build(
      [
        ["MCU1", "esp32_devkit", 0, 0, { firmware: OLED_WEATHER }],
        ["BME280", "bme280", 300, -10, { temperature: 21, temperature_end: 33 }],
        ["OLED1", "oled_ssd1306", 300, 170],
      ],
      [
        ["MCU1:3v3", "BME280:vcc"],
        ["MCU1:gnd", "BME280:gnd"],
        ["MCU1:gpio21", "BME280:sda"],
        ["MCU1:gpio22", "BME280:scl"],
        ["MCU1:3v3", "OLED1:vcc"],
        ["MCU1:gnd", "OLED1:gnd"],
        ["MCU1:gpio21", "OLED1:sda"],
        ["MCU1:gpio22", "OLED1:scl"],
      ],
    ),
    options: { ticks: 20, tick_ms: 500 },
  },
  {
    id: "esp32-servo-sweep",
    title: "ESP32 servo sweep",
    category: "MCU",
    description: "Firmware sweeps an SG90 servo from 0 to 180 and back",
    circuit: build(
      [
        ["MCU1", "esp32_devkit", 0, 0, { firmware: SERVO_SWEEP }],
        ["SRV1", "servo_sg90", 320, 60],
      ],
      [
        ["MCU1:3v3", "SRV1:vcc"],
        ["MCU1:gnd", "SRV1:gnd"],
        ["MCU1:gpio13", "SRV1:signal"],
      ],
    ),
    options: { ticks: 18, tick_ms: 300 },
  },
  {
    id: "rpi-gpio-led",
    title: "Raspberry Pi GPIO LED",
    category: "MCU",
    description: "Blink an LED on BCM GPIO17 from a Raspberry Pi 4 — 330 Ω to ground",
    circuit: build(
      [
        ["PI", "raspberry_pi_4", 0, 0, { firmware: PI_GPIO_LED }],
        ["R1", "resistor", 360, 150, { resistance: 330 }],
        ["LED1", "led", 520, 120, { color: "red" }],
      ],
      [
        ["PI:gpio17", "R1:a"],
        ["R1:b", "LED1:anode"],
        ["LED1:cathode", "PI:gnd"],
      ],
    ),
    options: { ticks: 16, tick_ms: 400 },
  },
  {
    id: "esp32s3-blink",
    title: "ESP32-S3 blink",
    category: "MCU",
    description: "ESP32-S3 blinks its onboard LED and an external LED on GPIO5",
    circuit: build(
      [
        ["MCU1", "esp32_s3", 0, 0, { firmware: S3_BLINK }],
        ["R1", "resistor", 360, 150, { resistance: 220 }],
        ["LED1", "led", 520, 120, { color: "blue" }],
      ],
      [
        ["MCU1:gpio5", "R1:a"],
        ["R1:b", "LED1:anode"],
        ["LED1:cathode", "MCU1:gnd"],
      ],
    ),
    options: { ticks: 16, tick_ms: 400 },
  },
];
