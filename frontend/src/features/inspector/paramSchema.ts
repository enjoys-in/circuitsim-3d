import type { ComponentDef, Params } from "../../domain";
import { humanize } from "../../shared/lib/format";
import { LED_COLORS } from "../parts/paint";

export type ParamKind = "firmware" | "color" | "toggle" | "range" | "value" | "ramp" | "memory";

export interface ParamDescriptor {
  key: string;
  label: string;
  kind: ParamKind;
  unit?: string;
  options?: { value: string; label: string }[];
  memory?: { words: number; bits: number };
}

const HIDDEN = new Set(["mcu", "bus", "product_url", "vendor", "image", "price", "sku"]);
const TOGGLES = new Set(["pressed", "value", "closed"]);
const TOGGLE_PARTS = new Set(["push_button", "input", "push_button_nc", "toggle_switch"]);
const RANGES = new Set(["position"]);
const NON_RAMP = new Set(["i2c_addr", "firmware"]);

const UNITS: Record<string, string> = {
  resistance: "Ω",
  capacitance: "F",
  inductance: "H",
  voltage: "V",
  vout: "V",
  vf: "V",
  vz: "V",
  vth: "V",
  dropout: "V",
  max_current: "A",
  rated_current: "A",
  power_rating: "W",
  lux: "lx",
  temperature: "°C",
  humidity: "%",
  pressure: "hPa",
  field: "mT",
  period: "ticks",
  capacity_mah: "mAh",
  accel_x: "m/s²",
  accel_y: "m/s²",
  accel_z: "m/s²",
  gyro_x: "°/s",
  gyro_y: "°/s",
  gyro_z: "°/s",
  latitude: "°",
  longitude: "°",
  altitude: "m",
  speed: "km/h",
  ppm: "ppm",
  co2: "ppm",
  pm25: "µg/m³",
  pm10: "µg/m³",
  distance_cm: "cm",
  distance_m: "m",
  moisture_pct: "%",
  level_pct: "%",
  flow_lpm: "L/min",
  ph: "pH",
  bpm: "bpm",
  current: "A",
  weight_g: "g",
  force_n: "N",
  bend_deg: "°",
  pressure_bar: "bar",
  sound_db: "dB",
};

const COLOR_OPTIONS = Object.keys(LED_COLORS).map((c) => ({ value: c, label: c }));

// A ROM-like part exposes a0.. address pins and d0.. data pins; its `data` param is the program.
function memoryMeta(def: ComponentDef): { words: number; bits: number } | undefined {
  const addr = def.pins.filter((p) => /^a\d+$/.test(p.name)).length;
  const bits = def.pins.filter((p) => /^d\d+$/.test(p.name)).length;
  if (addr && bits) return { words: 1 << addr, bits };
  // The CPU block stores its program as 16 instruction bytes (opcode nibble + operand nibble).
  if (def.key === "cpu") return { words: 16, bits: 8 };
  return undefined;
}

function kindOf(def: ComponentDef, key: string): ParamKind {
  if (key === "firmware") return "firmware";
  if (key === "color") return "color";
  if (key === "data" && memoryMeta(def)) return "memory";
  if (TOGGLES.has(key) && TOGGLE_PARTS.has(def.key)) return "toggle";
  if (RANGES.has(key)) return "range";
  return "value";
}

export function describeParams(def: ComponentDef, params: Params): ParamDescriptor[] {
  const keys = [...new Set([...Object.keys(def.default_params), ...Object.keys(params)])].filter(
    (key) => !HIDDEN.has(key) && !key.endsWith("_end"),
  );
  const base = keys.map<ParamDescriptor>((key) => {
    const kind = kindOf(def, key);
    return {
      key,
      label: humanize(key),
      kind,
      unit: UNITS[key],
      options: key === "color" ? COLOR_OPTIONS : undefined,
      memory: kind === "memory" ? memoryMeta(def) : undefined,
    };
  });
  if (def.category !== "sensor") return base;
  const ramps = keys
    .filter((key) => !NON_RAMP.has(key) && typeof def.default_params[key] === "number")
    .map<ParamDescriptor>((key) => ({ key: `${key}_end`, label: `${humanize(key)} ramps to`, kind: "ramp", unit: UNITS[key] }));
  return [...base, ...ramps];
}

export function coerceValue(raw: string, previous: unknown): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return typeof previous === "number" ? previous : "";
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : trimmed;
}
