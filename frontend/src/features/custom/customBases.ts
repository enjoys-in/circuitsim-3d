import type { ComponentCategory, Pin, PinDirection } from "../../domain";

export interface CustomBase {
  key: string; // real catalog key used at simulation time
  label: string;
  category: ComponentCategory;
  pins: Pin[];
  param: string; // the editable value stored in default_params
  valueLabel: string;
  unit?: string;
  defaultValue: string;
}

const pin = (name: string, direction: PinDirection): Pin => ({ name, direction, x: 0, y: 0 });

// Base behaviours a custom part can map onto so it participates in simulation.
export const CUSTOM_BASES: Record<string, CustomBase> = {
  resistor: {
    key: "resistor",
    label: "Resistor (2-pin)",
    category: "passive",
    pins: [pin("a", "passive"), pin("b", "passive")],
    param: "resistance",
    valueLabel: "Resistance",
    unit: "Ω",
    defaultValue: "1000",
  },
  capacitor: {
    key: "capacitor",
    label: "Capacitor (2-pin)",
    category: "passive",
    pins: [pin("a", "passive"), pin("b", "passive")],
    param: "capacitance",
    valueLabel: "Capacitance",
    defaultValue: "100nF",
  },
  dc_supply: {
    key: "dc_supply",
    label: "DC source (2-pin)",
    category: "power",
    pins: [pin("+", "power"), pin("-", "ground")],
    param: "voltage",
    valueLabel: "Voltage",
    unit: "V",
    defaultValue: "5",
  },
  led: {
    key: "led",
    label: "LED (2-pin)",
    category: "passive",
    pins: [pin("anode", "passive"), pin("cathode", "passive")],
    param: "color",
    valueLabel: "Colour",
    defaultValue: "red",
  },
  inductor: {
    key: "inductor",
    label: "Inductor (2-pin)",
    category: "passive",
    pins: [pin("a", "passive"), pin("b", "passive")],
    param: "inductance",
    valueLabel: "Inductance",
    defaultValue: "10uH",
  },
  potentiometer: {
    key: "potentiometer",
    label: "Potentiometer (3-pin)",
    category: "passive",
    pins: [pin("1", "passive"), pin("wiper", "passive"), pin("3", "passive")],
    param: "resistance",
    valueLabel: "Resistance",
    unit: "Ω",
    defaultValue: "10000",
  },
  diode: {
    key: "diode",
    label: "Diode (2-pin)",
    category: "passive",
    pins: [pin("anode", "passive"), pin("cathode", "passive")],
    param: "model",
    valueLabel: "Model",
    defaultValue: "1N4148",
  },
  push_button: {
    key: "push_button",
    label: "Push button (2-pin)",
    category: "passive",
    pins: [pin("a", "passive"), pin("b", "passive")],
    param: "pressed",
    valueLabel: "Pressed (0 or 1)",
    defaultValue: "0",
  },
};

export const CUSTOM_BASE_KEYS = new Set(Object.values(CUSTOM_BASES).map((b) => b.key));
