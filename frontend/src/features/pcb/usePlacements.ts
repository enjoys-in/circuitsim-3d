import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Circuit, ComponentDef } from "../../domain";
import { snap } from "./model/geometry";
import { autoPlace, syncPlacements } from "./model/placement";
import type { Board, Layer, Placement, Point } from "./model/pcbTypes";
import { otherLayer } from "./model/pcbTypes";

const DEFAULT_BOARD: Board = { width: 320, height: 240 };

export interface PlacementController {
  placements: Map<string, Placement>;
  board: Board;
  autoArrange: () => void;
  moveComponent: (id: string, point: Point) => void;
  rotateComponent: (id: string) => void;
  flipComponent: (id: string) => void;
  resizeBoard: (patch: Partial<Board>) => void;
}

export function usePlacements(circuit: Circuit, catalog: ReadonlyMap<string, ComponentDef>): PlacementController {
  const [placements, setPlacements] = useState<Map<string, Placement>>(new Map());
  const [board, setBoard] = useState<Board>(DEFAULT_BOARD);
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
      autoArrange,
      moveComponent: (id, point) => patch(id, (p) => ({ ...p, x: snap(point.x), y: snap(point.y) })),
      rotateComponent: (id) => patch(id, (p) => ({ ...p, rotation: (p.rotation + 90) % 360 })),
      flipComponent: (id) => patch(id, (p) => ({ ...p, side: otherLayer(p.side) as Layer })),
      resizeBoard: (delta) => setBoard((prev) => ({ ...prev, ...delta })),
    }),
    [placements, board, autoArrange, patch],
  );
}
