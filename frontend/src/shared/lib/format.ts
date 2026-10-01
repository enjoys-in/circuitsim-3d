const PREFIXES: [number, string][] = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
];

export function formatSI(value: number, unit = "", digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return `0 ${unit}`.trim();
  const magnitude = Math.abs(value);
  const [scale, prefix] = PREFIXES.find(([s]) => magnitude >= s) ?? PREFIXES[PREFIXES.length - 1];
  return `${Number((value / scale).toPrecision(digits))} ${prefix}${unit}`.trim();
}

const SI_UNITS = new Set(["V", "A", "W", "F", "H", "Ω", "s"]);

export function formatValue(value: unknown, unit = ""): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (SI_UNITS.has(unit)) return formatSI(value, unit);
    return `${Number(value.toPrecision(6))} ${unit}`.trim();
  }
  if (typeof value === "boolean") return value ? "on" : "off";
  return String(value);
}

export function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}
