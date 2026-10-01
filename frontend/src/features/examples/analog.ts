import { build, type Example } from "./build";

export const ANALOG_EXAMPLES: Example[] = [
  {
    id: "led-button",
    title: "LED + push button",
    category: "Analog",
    description: "Click the button to switch the LED",
    circuit: build(
      [
        ["V1", "dc_supply", 0, 0, { voltage: 5 }],
        ["SW1", "push_button", 220, -30, { pressed: 1 }],
        ["R1", "resistor", 340, -18, { resistance: 220 }],
        ["LED1", "led", 500, -60, { color: "red" }],
        ["GND1", "ground", 110, 160],
      ],
      [
        ["V1:+", "SW1:a"],
        ["SW1:b", "R1:a"],
        ["R1:b", "LED1:anode"],
        ["LED1:cathode", "V1:-"],
        ["V1:-", "GND1:gnd"],
      ],
    ),
    options: { analysis: "op" },
  },
  {
    id: "voltage-divider",
    title: "Voltage divider",
    category: "Analog",
    description: "Two resistors split 10 V — probe the midpoint",
    circuit: build(
      [
        ["V1", "dc_supply", 0, 0, { voltage: 10 }],
        ["R1", "resistor", 240, -20, { resistance: 6800 }],
        ["R2", "resistor", 240, 120, { resistance: 3300 }],
        ["GND1", "ground", 110, 200],
      ],
      [
        ["V1:+", "R1:a"],
        ["R1:b", "R2:a"],
        ["R2:b", "V1:-"],
        ["V1:-", "GND1:gnd"],
      ],
    ),
  },
  {
    id: "pot-dimmer",
    title: "Potentiometer dimmer",
    category: "Analog",
    description: "Turn the pot to change LED brightness through a transistor",
    circuit: build(
      [
        ["V1", "dc_supply", 0, 0, { voltage: 5 }],
        ["RV1", "potentiometer", 210, 120, { resistance: 10000, position: 0.7 }],
        ["R1", "resistor", 210, -30, { resistance: 330 }],
        ["LED1", "led", 380, -60, { color: "green" }],
        ["Q1", "npn_bjt", 380, 120],
        ["GND1", "ground", 90, 240],
      ],
      [
        ["V1:+", "R1:a"],
        ["R1:b", "LED1:anode"],
        ["LED1:cathode", "Q1:collector"],
        ["V1:+", "RV1:1"],
        ["RV1:3", "V1:-"],
        ["RV1:wiper", "Q1:base"],
        ["Q1:emitter", "V1:-"],
        ["V1:-", "GND1:gnd"],
      ],
    ),
  },
  {
    id: "zener-reg",
    title: "Zener shunt regulator",
    category: "Analog",
    description: "A 5.1 V zener clamps a 12 V rail through a series resistor",
    circuit: build(
      [
        ["V1", "dc_supply", 0, 0, { voltage: 12 }],
        ["R1", "resistor", 240, -20, { resistance: 470 }],
        ["D1", "zener_diode", 400, 90, { vz: 5.1 }],
        ["RL", "resistor", 540, 90, { resistance: 2200 }],
        ["GND1", "ground", 110, 220],
      ],
      [
        ["V1:+", "R1:a"],
        ["R1:b", "D1:cathode"],
        ["R1:b", "RL:a"],
        ["D1:anode", "V1:-"],
        ["RL:b", "V1:-"],
        ["V1:-", "GND1:gnd"],
      ],
    ),
  },
  {
    id: "rc-charge",
    title: "RC charging curve",
    category: "Analog",
    description: "Transient of a 1 kΩ / 10 µF network (τ = 10 ms)",
    circuit: build(
      [
        ["V1", "dc_supply", 0, 0, { voltage: 5 }],
        ["R1", "resistor", 200, -20, { resistance: 1000 }],
        ["C1", "electrolytic_cap", 360, -10, { capacitance: "10uF" }],
        ["GND1", "ground", 110, 150],
      ],
      [
        ["V1:+", "R1:a"],
        ["R1:b", "C1:+"],
        ["C1:-", "V1:-"],
        ["V1:-", "GND1:gnd"],
      ],
    ),
    options: { analysis: "tran", t_stop: 0.05, steps: 250 },
  },
];
