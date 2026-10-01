import { build, type Example } from "./build";

export const POWER_EXAMPLES: Example[] = [
  {
    id: "buck-supply",
    title: "Buck converter rail",
    category: "Power",
    description: "12 V stepped down to 3.3 V driving an LED",
    circuit: build(
      [
        ["V1", "dc_supply", 0, 0, { voltage: 12 }],
        ["U1", "buck_converter", 220, 10, { vout: 3.3 }],
        ["R1", "resistor", 430, -20, { resistance: 100 }],
        ["LED1", "led", 570, -50, { color: "blue" }],
        ["GND1", "ground", 110, 200],
      ],
      [
        ["V1:+", "U1:vin"],
        ["V1:-", "U1:gnd"],
        ["U1:vout", "R1:a"],
        ["R1:b", "LED1:anode"],
        ["LED1:cathode", "V1:-"],
        ["V1:-", "GND1:gnd"],
      ],
    ),
  },
  {
    id: "lipo-charger",
    title: "LiPo charging",
    category: "Power",
    description: "5 V into a TP4056 charging a LiPo cell — watch the status LEDs",
    circuit: build(
      [
        ["V1", "dc_supply", 0, 0, { voltage: 5 }],
        ["U1", "tp4056_charger", 230, 20],
        ["BT1", "battery_lipo", 470, 30, { voltage: 3.7 }],
        ["GND1", "ground", 110, 200],
      ],
      [
        ["V1:+", "U1:in+"],
        ["V1:-", "U1:in-"],
        ["U1:bat+", "BT1:+"],
        ["U1:bat-", "BT1:-"],
        ["V1:-", "GND1:gnd"],
      ],
    ),
  },
  {
    id: "ina219-monitor",
    title: "INA219 current monitor",
    category: "Power",
    description: "Measure current into a load resistor across the shunt",
    circuit: build(
      [
        ["V1", "dc_supply", 0, 0, { voltage: 5 }],
        ["U1", "ina219", 230, 10],
        ["RL", "resistor", 470, 40, { resistance: 100 }],
        ["GND1", "ground", 110, 210],
      ],
      [
        ["V1:+", "U1:vin+"],
        ["U1:vin-", "RL:a"],
        ["RL:b", "V1:-"],
        ["V1:+", "U1:vcc"],
        ["V1:-", "U1:gnd"],
        ["V1:-", "GND1:gnd"],
      ],
    ),
  },
];
