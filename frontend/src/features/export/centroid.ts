import type { Circuit, ComponentDef, Params } from "../../domain";
import { UNITS_PER_MM, type Board, type Placement } from "../pcb/model/pcbTypes";

export interface CentroidInput {
  circuit: Circuit;
  catalog: ReadonlyMap<string, ComponentDef>;
  placements: Map<string, Placement>;
  board: Board;
}

const VALUE_KEYS = ["resistance", "capacitance", "inductance", "voltage", "value", "forward_voltage"];

function valueOf(def: ComponentDef, params: Params): string {
  for (const key of VALUE_KEYS) {
    const v = params[key] ?? def.default_params[key];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return def.name;
}

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Centroid / pick-and-place CSV (JLCPCB-style columns) so an assembly house can place
// each part: designator, value, footprint, board-space X/Y in mm, rotation and layer.
export function buildCentroid(input: CentroidInput): string {
  const { circuit, catalog, placements, board } = input;
  const header = ["Designator", "Val", "Package", "Mid X", "Mid Y", "Rotation", "Layer"];
  const rows: string[] = [header.join(",")];

  for (const inst of circuit.instances) {
    const def = catalog.get(inst.component_key);
    const placement = placements.get(inst.id);
    if (!def || !placement) continue;
    const midX = (placement.x / UNITS_PER_MM).toFixed(3);
    const midY = ((board.height - placement.y) / UNITS_PER_MM).toFixed(3);
    rows.push(
      [
        cell(inst.label || inst.id),
        cell(valueOf(def, inst.params)),
        cell(def.subcategory || def.key),
        `${midX}mm`,
        `${midY}mm`,
        String(placement.rotation % 360),
        placement.side === "bottom" ? "Bottom" : "Top",
      ].join(","),
    );
  }

  return rows.join("\n") + "\n";
}
