import type { ComponentDef, PinDirection } from "../../../domain";

const SIGNAL_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];
const POWER_COLOR = "#ef4444";
const GROUND_COLOR = "#1c1c1f";

function direction(def: ComponentDef | undefined, pin: string | null | undefined): PinDirection | undefined {
  return def?.pins.find((p) => p.name === pin)?.direction;
}

export function pickWireColor(
  endpoints: [ComponentDef | undefined, string | null | undefined][],
  existingWires: number,
): string {
  const directions = endpoints.map(([def, pin]) => direction(def, pin));
  if (directions.includes("ground")) return GROUND_COLOR;
  if (directions.includes("power")) return POWER_COLOR;
  return SIGNAL_COLORS[existingWires % SIGNAL_COLORS.length];
}
