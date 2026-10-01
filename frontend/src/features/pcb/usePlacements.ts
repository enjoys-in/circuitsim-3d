import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Circuit, ComponentDef } from "../../domain";
import { usePersistentState } from "../../shared/hooks/usePersistentState";
import { getFootprint } from "./model/footprints";
import { snap } from "./model/geometry";
import { autoPlace, syncPlacements } from "./model/placement";
import type { Board, Layer, PadOverride, Placement, Point } from "./model/pcbTypes";
import { otherLayer } from "./model/pcbTypes";

const DEFAULT_BOARD: Board = { width: 320, height: 240 };
const BOARD_MARGIN = 40;
const PLACEMENTS_KEY = "circuitsim.pcb.placements";

function readPlacements(): Map<string, Placement> {
  try {
    const raw = window.localStorage.getItem(PLACEMENTS_KEY);
    return raw ? new Map(JSON.parse(raw) as [string, Placement][]) : new Map();
  } catch {
    return new Map();
  }
}

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
  selectedPadId: string | null;
  selectComponent: (id: string | null) => void;
  selectPad: (id: string | null) => void;
  autoArrange: () => void;
  moveComponent: (id: string, point: Point) => void;
  rotateComponent: (id: string) => void;
  flipComponent: (id: string) => void;
  setBodySize: (id: string, patch: { w?: number; h?: number }) => void;
  setPadScale: (id: string, scale: number) => void;
  rotatePads: (id: string) => void;
  setPadBox: (instanceId: string, padName: string, override: PadOverride) => void;
  turnPad: (instanceId: string, padName: string) => void;
  resizeBoard: (patch: Partial<Board>) => void;
}

export function usePlacements(circuit: Circuit, catalog: ReadonlyMap<string, ComponentDef>): PlacementController {
  const [placements, setPlacements] = useState<Map<string, Placement>>(readPlacements);
  const [board, setBoard] = usePersistentState<Board>("circuitsim.pcb.board", DEFAULT_BOARD);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  // Restored placements already represent a laid-out board, so skip the auto-place seed.
  const seeded = useRef(placements.size > 0);

  useEffect(() => {
    // Wait for the circuit to load before touching placements, so a refresh doesn't wipe
    // the restored layout on the first (empty-circuit) render.
    if (circuit.instances.length === 0) return;
    setPlacements((prev) => {
      if (!seeded.current) {
        seeded.current = true;
        const result = autoPlace(circuit, catalog, prev);
        setBoard(result.board);
        return result.placements;
      }
      return syncPlacements(circuit, catalog, prev);
    });
  }, [circuit, catalog, setBoard]);

  // Persist the layout so a page refresh restores it (debounced to smooth dragging).
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(PLACEMENTS_KEY, JSON.stringify([...placements]));
      } catch {
        /* storage unavailable */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [placements]);

  // Keep the board large enough for every placed part (parts used to fall off-board).
  useEffect(() => {
    setBoard((prev) => fitBoard(circuit, catalog, placements, prev));
  }, [circuit, catalog, placements]);

  // Drop the selection when its part leaves the circuit.
  useEffect(() => {
    setSelectedId((id) => (id && circuit.instances.some((i) => i.id === id) ? id : null));
    setSelectedPadId((pid) =>
      pid && circuit.instances.some((i) => i.id === pid.split(":")[0]) ? pid : null,
    );
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
      selectedPadId,
      selectComponent: (id) => {
        setSelectedId(id);
        setSelectedPadId(null);
      },
      selectPad: (id) => {
        setSelectedPadId(id);
        if (id) setSelectedId(id.split(":")[0]);
      },
      autoArrange,
      moveComponent: (id, point) => patch(id, (p) => ({ ...p, x: snap(point.x), y: snap(point.y) })),
      rotateComponent: (id) => patch(id, (p) => ({ ...p, rotation: (p.rotation + 90) % 360 })),
      flipComponent: (id) => patch(id, (p) => ({ ...p, side: otherLayer(p.side) as Layer })),
      setBodySize: (id, size) =>
        patch(id, (p) => ({
          ...p,
          bodyW: size.w !== undefined ? Math.max(20, Math.round(size.w)) : p.bodyW,
          bodyH: size.h !== undefined ? Math.max(20, Math.round(size.h)) : p.bodyH,
        })),
      setPadScale: (id, scale) =>
        patch(id, (p) => ({ ...p, padScale: Math.min(2.5, Math.max(0.5, scale)) })),
      rotatePads: (id) => patch(id, (p) => ({ ...p, padAngle: ((p.padAngle ?? 0) + 90) % 360 })),
      setPadBox: (instanceId, padName, override) =>
        patch(instanceId, (p) => ({
          ...p,
          pads: { ...p.pads, [padName]: { ...p.pads?.[padName], ...override } },
        })),
      turnPad: (instanceId, padName) =>
        patch(instanceId, (p) => {
          const prev = p.pads?.[padName] ?? {};
          return { ...p, pads: { ...p.pads, [padName]: { ...prev, angle: ((prev.angle ?? 0) + 90) % 360 } } };
        }),
      resizeBoard: (delta) => setBoard((prev) => ({ ...prev, ...delta })),
    }),
    [placements, board, selectedId, selectedPadId, autoArrange, patch],
  );
}
