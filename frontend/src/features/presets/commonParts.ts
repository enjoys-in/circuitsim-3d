import type { PartPreset } from "./PresetsContext";

// Ready-to-drag common values. Each is a real catalog component with preset params,
// so they simulate normally and every value stays editable in the inspector.

function resistor(ohms: number, name: string): PartPreset {
  return { id: `cp-r-${ohms}`, name, baseKey: "resistor", params: { resistance: ohms } };
}

function pot(ohms: number, name: string): PartPreset {
  return {
    id: `cp-pot-${ohms}`,
    name,
    baseKey: "potentiometer",
    params: { resistance: ohms, position: 0.5 },
  };
}

function cap(value: string, name: string, electrolytic = false): PartPreset {
  return {
    id: `cp-c-${value}`,
    name,
    baseKey: electrolytic ? "electrolytic_cap" : "capacitor",
    params: { capacitance: value },
  };
}

function led(color: string): PartPreset {
  return {
    id: `cp-led-${color}`,
    name: `${color[0].toUpperCase()}${color.slice(1)} LED`,
    baseKey: "led",
    params: { color },
  };
}

export const COMMON_PARTS: PartPreset[] = [
  // Resistors (E12 favourites)
  resistor(220, "220 Ω"),
  resistor(330, "330 Ω"),
  resistor(470, "470 Ω"),
  resistor(1000, "1 kΩ"),
  resistor(2200, "2.2 kΩ"),
  resistor(4700, "4.7 kΩ"),
  resistor(10000, "10 kΩ"),
  resistor(47000, "47 kΩ"),
  resistor(100000, "100 kΩ"),
  resistor(1000000, "1 MΩ"),
  pot(10000, "10 kΩ pot"),
  pot(100000, "100 kΩ pot"),
  // Capacitors
  cap("1nF", "1 nF"),
  cap("10nF", "10 nF"),
  cap("100nF", "100 nF"),
  cap("1uF", "1 µF"),
  cap("10uF", "10 µF", true),
  cap("100uF", "100 µF", true),
  cap("470uF", "470 µF", true),
  // LEDs
  led("red"),
  led("green"),
  led("blue"),
  led("yellow"),
  led("white"),
  // Switches & buttons
  { id: "cp-btn", name: "Push button", baseKey: "push_button", params: { pressed: 0 } },
  { id: "cp-btn-nc", name: "NC button", baseKey: "push_button_nc", params: { pressed: 0, normally_closed: 1 } },
  { id: "cp-toggle", name: "Toggle switch", baseKey: "toggle_switch", params: { closed: 0 } },
];
