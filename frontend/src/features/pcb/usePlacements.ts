import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Circuit, ComponentDef } from "../../domain";
import { getFootprint } from "./model/footprints";
import { snap } from "./model/geometry";
import { autoPlace, syncPlacements } from "./model/placement";
import type { Board, Layer, Placement, Point } from "./model/pcbTypes";
import { otherLayer } from "./model/pcbTypes";

const DEFAULT_BOARD: Board = { width: 320, height: 240 };
const BOARD_MARGIN = 40;

// Grow the board so every placed footprint fits; never shrink (avoids drag thrash).
function fitBoard(
  circuit: Circuit,
  catalog: ReadonlyMap<string, ComponentDef>,
  placements: Map<string, Placement>,
  current: Board,
): Board {
  let maxX = DEFAULT_BOARD.width;
  let maxY = DEFAULT_BOARD.height;
  for (const inst of circuit.instances) {
    const placement = placements.get(inst.id);
    const def = catalog.get(inst.component_key);
    if (!placement || !def) continue;
    const footprint = getFootprint(def);
    maxX = Math.max(maxX, placement.x + footprint.width / 2 + BOARD_MARGIN);
    maxY = Math.max(maxY, placement.y + footprint.height / 2 + BOARD_MARGIN);
  }
  const width = Math.max(current.width, Math.ceil(maxX));
  const height = Math.max(current.height, Math.ceil(maxY));
  return width === current.width && height === current.height ? current : { width, height };
}

export interface PlacementController {
  placements: Map<string, Placement>;
  board: Board;
  selectedId: string | null;
  selectComponent: (id: string | null) => void;
  autoArrange: () => void;
  moveComponent: (id: string, point: Point) => void;
  rotateComponent: (id: string) => void;
  flipComponent: (id: string) => void;
  resizeBoard: (patch: Partial<Board>) => void;
}

export function usePlacements(circuit: Circuit, catalog: ReadonlyMap<string, ComponentDef>): PlacementController {
  const [placements, setPlacements] = useState<Map<string, Placement>>(new Map());
  const [board, setBoard] = useState<Board>(DEFAULT_BOARD);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    setPlacements((prev) => {
      if (!seeded.current && circuit.instances.length > 0) {
        seeded.current = true;
        const result = autoPlace(circuit, catalog, prev);
        setBoard(result.board);
        return result.placements;
      }
      return syncPlacements(circuit, catalog, prev);
    });
  }, [circuit, catalog]);

  // Keep the board large enough for every placed part (parts used to fall off-board).
  useEffect(() => {
    setBoard((prev) => fitBoard(circuit, catalog, placements, prev));
  }, [circuit, catalog, placements]);

  // Drop the selection when its part leaves the circuit.
  useEffect(() => {
    setSelectedId((id) => (id && circuit.instances.some((i) => i.id === id) ? id : null));
  }, [circuit]);

  const patch = useCallback(
    (id: string, next: (p: Placement) => Placement) =>
      setPlacements((prev) => {
        const current = prev.get(id);
        if (!current) return prev;
        const copy = new Map(prev);
        copy.set(id, next(current));
        return copy;
      }),
    [],
  );

  const autoArrange = useCallback(() => {
    const result = autoPlace(circuit, catalog, new Map());
    setPlacements(result.placements);
    setBoard(result.board);
  }, [circuit, catalog]);

  return useMemo<PlacementController>(
    () => ({
      placements,
      board,
      selectedId,
      selectComponent: setSelectedId,
      autoArrange,
      moveComponent: (id, point) => patch(id, (p) => ({ ...p, x: snap(point.x), y: snap(point.y) })),
      rotateComponent: (id) => patch(id, (p) => ({ ...p, rotation: (p.rotation + 90) % 360 })),
      flipComponent: (id) => patch(id, (p) => ({ ...p, side: otherLayer(p.side) as Layer })),
      resizeBoard: (delta) => setBoard((prev) => ({ ...prev, ...delta })),
    }),
    [placements, board, selectedId, autoArrange, patch],
  );
}
