import type { Params } from "../../domain";
import { PRESET_MIME } from "../../shared/constants";

export interface DragPreset {
  name: string;
  params: Params;
}

// A preset tile carries its name + saved params alongside the base part key.
export function readPreset(dt: DataTransfer): DragPreset | null {
  const raw = dt.getData(PRESET_MIME);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const { name, params } = parsed as { name?: unknown; params?: unknown };
      return { name: typeof name === "string" ? name : "", params: (params as Params) ?? {} };
    }
  } catch {
    return null;
  }
  return null;
}
