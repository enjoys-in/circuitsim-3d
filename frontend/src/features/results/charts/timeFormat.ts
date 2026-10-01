import { formatSI } from "../../../shared/lib/format";

export function formatTime(value: number, unit: "s" | "tick"): string {
  return unit === "tick" ? `t${Math.round(value)}` : formatSI(value, "s");
}
