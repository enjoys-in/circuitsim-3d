import type { Circuit, ComponentDef } from "../../../domain";
import { getFootprint } from "./footprints";
import { snap } from "./geometry";
import type { Board, Placement } from "./pcbTypes";
import { GRID } from "./pcbTypes";

const BOARD_MARGIN = 40;
const MIN_BOARD = { width: 300, height: 220 };

export function autoPlace(
  circuit: Circuit,
  catalog: ReadonlyMap<string, ComponentDef>,
  previous: Map<string, Placement>,
): { placements: Map<string, Placement>; board: Board } {
  const positioned = circuit.instances.filter((i) => catalog.has(i.component_key));
  if (positioned.length === 0) return { placements: new Map(), board: { ...MIN_BOARD } };

  const xs = positioned.map((i) => i.position.x);
  const ys = positioned.map((i) => i.position.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  const placements = new Map<string, Placement>();
  let maxX = 0;
  let maxY = 0;
  for (const inst of positioned) {
    const footprint = getFootprint(catalog.get(inst.component_key)!);
    const prior = previous.get(inst.id);
    const x = prior?.x ?? snap(BOARD_MARGIN + (inst.position.x - minX) * 0.7 + footprint.width / 2);
    const y = prior?.y ?? snap(BOARD_MARGIN + (inst.position.y - minY) * 0.7 + footprint.height / 2);
    placements.set(inst.id, { x, y, rotation: prior?.rotation ?? 0, side: prior?.side ?? "top" });
    maxX = Math.max(maxX, x + footprint.width / 2);
    maxY = Math.max(maxY, y + footprint.height / 2);
  }

  const board: Board = {
    width: snap(Math.max(MIN_BOARD.width, maxX + BOARD_MARGIN), GRID),
    height: snap(Math.max(MIN_BOARD.height, maxY + BOARD_MARGIN), GRID),
  };
  return { placements, board };
}

export function syncPlacements(
  circuit: Circuit,
  catalog: ReadonlyMap<string, ComponentDef>,
  previous: Map<string, Placement>,
): Map<string, Placement> {
  const ids = new Set(circuit.instances.filter((i) => catalog.has(i.component_key)).map((i) => i.id));
  const kept = new Map<string, Placement>();
  for (const [id, placement] of previous) if (ids.has(id)) kept.set(id, placement);
  const missing = [...ids].filter((id) => !kept.has(id));
  if (missing.length === 0) return kept;
  const fresh = autoPlace(circuit, catalog, kept).placements;
  for (const id of missing) {
    const placement = fresh.get(id);
    if (placement) kept.set(id, placement);
  }
  return kept;
}
