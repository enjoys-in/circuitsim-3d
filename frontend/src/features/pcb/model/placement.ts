import type { Circuit, ComponentDef } from "../../../domain";
import { getFootprint } from "./footprints";
import { snap } from "./geometry";
import type { Board, Footprint, Placement } from "./pcbTypes";
import { GRID } from "./pcbTypes";

const BOARD_MARGIN = 40;
// Clear space kept between adjacent footprints, and above each part for its ref label.
const GAP = 30;
const LABEL_SPACE = 18;
const MIN_BOARD = { width: 300, height: 220 };

interface Item {
  id: string;
  footprint: Footprint;
}

interface FlowResult {
  placements: Map<string, Placement>;
  bottom: number;
}

// Lay items out left-to-right in rows that wrap once a row reaches `rowWidth`, packed
// so no two footprints (plus their gap and label space) ever overlap. Rows start at
// (originX, originY) and each item is centred on the grid.
function flowRows(items: Item[], originX: number, originY: number, rowWidth: number): FlowResult {
  const placements = new Map<string, Placement>();
  let cursorX = originX;
  let rowTop = originY;
  let rowHeight = 0;
  for (const { id, footprint } of items) {
    const w = footprint.width;
    const blockH = footprint.height + LABEL_SPACE;
    // Wrap to a new row when this part would spill past the target width.
    if (cursorX > originX && cursorX + w > originX + rowWidth) {
      cursorX = originX;
      rowTop += rowHeight + GAP;
      rowHeight = 0;
    }
    placements.set(id, {
      x: snap(cursorX + w / 2),
      // Reserve LABEL_SPACE above the body so the ref label never lands on the row above.
      y: snap(rowTop + LABEL_SPACE + footprint.height / 2),
      rotation: 0,
      side: "top",
    });
    cursorX += w + GAP;
    rowHeight = Math.max(rowHeight, blockH);
  }
  return { placements, bottom: rowTop + rowHeight };
}

// A pleasant row width: wide enough for the widest part, but otherwise sized from the
// total footprint area so the finished board lands near a 4:3 rectangle.
function targetRowWidth(items: Item[]): number {
  let area = 0;
  let widest = 0;
  for (const { footprint } of items) {
    area += footprint.width * (footprint.height + LABEL_SPACE);
    widest = Math.max(widest, footprint.width);
  }
  return Math.max(widest, MIN_BOARD.width - BOARD_MARGIN * 2, Math.ceil(Math.sqrt(area) * 1.4));
}

function boardFor(
  placements: Map<string, Placement>,
  circuit: Circuit,
  catalog: ReadonlyMap<string, ComponentDef>,
): Board {
  let maxX = 0;
  let maxY = 0;
  for (const inst of circuit.instances) {
    const placement = placements.get(inst.id);
    const def = catalog.get(inst.component_key);
    if (!placement || !def) continue;
    const footprint = getFootprint(def);
    maxX = Math.max(maxX, placement.x + footprint.width / 2);
    maxY = Math.max(maxY, placement.y + footprint.height / 2);
  }
  return {
    width: snap(Math.max(MIN_BOARD.width, maxX + BOARD_MARGIN), GRID),
    height: snap(Math.max(MIN_BOARD.height, maxY + BOARD_MARGIN), GRID),
  };
}

export function autoPlace(
  circuit: Circuit,
  catalog: ReadonlyMap<string, ComponentDef>,
  previous: Map<string, Placement>,
): { placements: Map<string, Placement>; board: Board } {
  const positioned = circuit.instances.filter((i) => catalog.has(i.component_key));
  if (positioned.length === 0) return { placements: new Map(), board: { ...MIN_BOARD } };

  // Keep anything the caller already placed; only the rest gets flowed into free space.
  const placements = new Map<string, Placement>();
  const fresh: Item[] = [];
  let keptBottom = BOARD_MARGIN;
  for (const inst of positioned) {
    const footprint = getFootprint(catalog.get(inst.component_key)!);
    const prior = previous.get(inst.id);
    if (prior) {
      placements.set(inst.id, prior);
      keptBottom = Math.max(keptBottom, prior.y + footprint.height / 2);
    } else {
      fresh.push({ id: inst.id, footprint });
    }
  }

  if (fresh.length > 0) {
    // Flow fresh parts in schematic reading order (top-to-bottom, then left-to-right)
    // so the board roughly mirrors how the schematic is laid out.
    const positionOf = new Map(positioned.map((i) => [i.id, i.position]));
    fresh.sort((a, b) => {
      const pa = positionOf.get(a.id)!;
      const pb = positionOf.get(b.id)!;
      return pa.y - pb.y || pa.x - pb.x;
    });
    const originY = placements.size > 0 ? keptBottom + GAP : BOARD_MARGIN;
    const flowed = flowRows(fresh, BOARD_MARGIN, originY, targetRowWidth(fresh));
    for (const [id, placement] of flowed.placements) placements.set(id, placement);
  }

  return { placements, board: boardFor(placements, circuit, catalog) };
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
