import { toNumber } from "../../shared/lib/format";

const BAND_COLORS = ["#111111", "#7c3f12", "#dc2626", "#f97316", "#facc15", "#16a34a", "#2563eb", "#7c3aed", "#6b7280", "#f8fafc"];
const GOLD = "#c8a13a";
const SILVER = "#c0c0c0";

const PREFIX: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

export function parseSI(value: unknown, fallback: number): number {
  if (typeof value === "number") return value;
  const match = /^\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*([pnuµmkKMG]?)/i.exec(String(value ?? ""));
  if (!match) return fallback;
  return Number.parseFloat(match[1]) * (PREFIX[match[2]] ?? 1);
}

export function resistorBands(ohms: number): string[] {
  const value = Math.max(toNumber(ohms, 1000), 0.1);
  let exponent = Math.floor(Math.log10(value)) - 1;
  let digits = Math.round(value / 10 ** exponent);
  if (digits >= 100) {
    digits = Math.round(digits / 10);
    exponent += 1;
  }
  const multiplier = exponent >= 0 ? BAND_COLORS[exponent] ?? BAND_COLORS[9] : exponent === -1 ? GOLD : SILVER;
  return [BAND_COLORS[Math.floor(digits / 10)], BAND_COLORS[digits % 10], multiplier, GOLD];
}

export function capacitorCode(farads: number): string {
  const pico = farads * 1e12;
  if (pico < 10) return `${Number(pico.toPrecision(2))}p`;
  const exponent = Math.floor(Math.log10(pico)) - 1;
  return `${Math.round(pico / 10 ** exponent)}${exponent}`;
}
