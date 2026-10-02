import { formatSI } from "../../../shared/lib/format";

export interface Band {
  name: string;
  hex: string;
}

export interface ResistorCode {
  bands: Band[];
  value: number;
  text: string;
}

const DIGIT_COLORS: readonly (readonly [string, string])[] = [
  ["black", "#1b1b1b"],
  ["brown", "#7a4a1e"],
  ["red", "#c0271d"],
  ["orange", "#d9731f"],
  ["yellow", "#e5c035"],
  ["green", "#2e8b47"],
  ["blue", "#2f5fb3"],
  ["violet", "#7a4fb0"],
  ["grey", "#8a8f98"],
  ["white", "#eceff4"],
];
const GOLD: Band = { name: "gold", hex: "#caa33a" };

// Decode a resistance into a 4-band color code (two significant digits + decade
// multiplier + 5% gold tolerance). Returns null for values outside the 4-band range.
export function resistorColorCode(ohms: number): ResistorCode | null {
  if (!Number.isFinite(ohms) || ohms <= 0) return null;
  let exp = Math.floor(Math.log10(ohms)) - 1;
  let sig = Math.round(ohms / 10 ** exp);
  if (sig >= 100) {
    sig = Math.round(sig / 10);
    exp += 1;
  }
  if (sig < 10 || exp < 0 || exp > 9) return null;
  const d1 = Math.floor(sig / 10);
  const d2 = sig % 10;
  const band = (i: number): Band => ({ name: DIGIT_COLORS[i][0], hex: DIGIT_COLORS[i][1] });
  const value = sig * 10 ** exp;
  return { bands: [band(d1), band(d2), band(exp), GOLD], value, text: `${formatSI(value, "Ω")} ±5%` };
}

const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

// Smallest standard E12 resistor value at or above the target (so LED current stays
// at or below the requested limit).
export function nextE12Above(ohms: number): number {
  if (!Number.isFinite(ohms) || ohms <= 0) return 0;
  const decade = Math.floor(Math.log10(ohms / 10));
  for (let d = decade - 1; d <= decade + 2; d++) {
    for (const base of E12) {
      const v = base * 10 ** d;
      if (v >= ohms - 1e-9) return Math.round(v * 1000) / 1000;
    }
  }
  return ohms;
}

export interface LedCalc {
  resistor: number;
  e12: number;
  power: number;
}

export function ledSeriesResistor(supply: number, vf: number, current: number): LedCalc | null {
  if (!(supply > vf) || !(current > 0)) return null;
  const resistor = (supply - vf) / current;
  return { resistor, e12: nextE12Above(resistor), power: (supply - vf) * current };
}

const LED_VF: Record<string, number> = {
  red: 1.8,
  orange: 2.0,
  amber: 2.0,
  yellow: 2.1,
  green: 2.1,
  blue: 3.0,
  white: 3.1,
  uv: 3.4,
  ir: 1.4,
};

export function ledVf(color: unknown): number {
  return LED_VF[String(color ?? "").toLowerCase()] ?? 2.0;
}
