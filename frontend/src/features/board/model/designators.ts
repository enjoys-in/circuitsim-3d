import type { ComponentDef } from "../../../domain";

const PREFIX: Record<string, string> = {
  resistor: "R",
  potentiometer: "RV",
  ldr: "LDR",
  capacitor: "C",
  electrolytic_cap: "C",
  inductor: "L",
  led: "LED",
  diode: "D",
  zener_diode: "D",
  npn_bjt: "Q",
  pnp_bjt: "Q",
  nmos: "Q",
  pmos: "Q",
  push_button: "SW",
  input: "SW",
  output: "OUT",
  clock: "CLK",
  dc_supply: "V",
  battery_lipo: "BT",
  ground: "GND",
  dc_fan: "M",
  buzzer: "BZ",
};

const CATEGORY_PREFIX: Record<string, string> = {
  dev_board: "MCU",
  sensor: "S",
  logic: "U",
  power: "PS",
};

export function designatorPrefix(def: ComponentDef): string {
  return PREFIX[def.key] ?? CATEGORY_PREFIX[def.category] ?? "U";
}

export function nextDesignator(def: ComponentDef, taken: Iterable<string>): string {
  const prefix = designatorPrefix(def);
  const pattern = new RegExp(`^${prefix}(\d+)$`);
  let highest = 0;
  for (const label of taken) {
    const match = pattern.exec(label);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${prefix}${highest + 1}`;
}
