import { useCallback, useMemo } from "react";
import type { Circuit, ComponentDef } from "../../domain";
import { runDrc } from "./model/drc";
import { getFootprint } from "./model/footprints";
import { distance, padWorld } from "./model/geometry";
import { analyzeNets, collectPads, type Connectivity, type PadInfo } from "./model/nets";
import type { Obstacle, Placement } from "./model/pcbTypes";
import { otherLayer } from "./model/pcbTypes";
import type { DrcViolation } from "./model/pcbTypes";
import { usePlacements, type PlacementController } from "./usePlacements";
import { useRouting, type RoutingController } from "./useRouting";

const PAD_SNAP = 2;

export interface PcbState extends PlacementController, RoutingController {
  pads: PadInfo[];
  connectivity: Connectivity;
  drc: DrcViolation[];
  netCount: number;
  obstacles: Obstacle[];
}

export function usePcbState(circuit: Circuit, catalog: ReadonlyMap<string, ComponentDef>): PcbState {
  const placement = usePlacements(circuit, catalog);
  const routing = useRouting();

  const pads = useMemo(
    () => collectPads(circuit, catalog, placement.placements),
    [circuit, catalog, placement.placements],
  );

  const connectivity = useMemo(
    () => analyzeNets(pads, routing.traces, routing.vias),
    [pads, routing.traces, routing.vias],
  );

  const netCount = useMemo(
    () => new Set(pads.map((p) => p.netId).filter(Boolean)).size,
    [pads],
  );

  // Component body boxes (rotation-aware AABB) so the auto-router can detour around parts.
  const obstacles = useMemo<Obstacle[]>(() => {
    const boxes: Obstacle[] = [];
    for (const inst of circuit.instances) {
      const def = catalog.get(inst.component_key);
      const place = placement.placements.get(inst.id);
      if (!def || !place) continue;
      const fp = getFootprint(def);
      const w = place.bodyW ?? fp.width;
      const h = place.bodyH ?? fp.height;
      const rad = (place.rotation * Math.PI) / 180;
      const hw = (Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))) / 2;
      const hh = (Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))) / 2;
      boxes.push({ minX: place.x - hw, maxX: place.x + hw, minY: place.y - hh, maxY: place.y + hh });
    }
    return boxes;
  }, [circuit, catalog, placement.placements]);

  const drc = useMemo(
    () => runDrc(routing.traces, placement.board, connectivity.routedNets, netCount),
    [routing.traces, placement.board, connectivity.routedNets, netCount],
  );

  // Re-anchor trace ends attached to a part's pads to where those pads land in
  // the next placement — keeps copper joined through rotate/flip (no stale traces).
  const reanchor = useCallback(
    (id: string, next: Placement) => {
      const inst = circuit.instances.find((i) => i.id === id);
      const def = inst && catalog.get(inst.component_key);
      if (!inst || !def) return;
      const footprint = getFootprint(def);
      const instPads = pads.filter((p) => p.instanceId === id);
      const updates = [];
      for (const trace of routing.traces) {
        const ends = trace.points.length < 2 ? [0] : [0, trace.points.length - 1];
        for (const index of ends) {
          const pad = instPads.find((p) => distance(p.point, trace.points[index]) <= PAD_SNAP);
          const local = pad && footprint.pads.find((fp) => fp.name === pad.name);
          if (!local) continue;
          updates.push({ traceId: trace.id, index, point: padWorld(local, next, footprint) });
        }
      }
      if (updates.length) routing.setTraceEndpoints(updates);
    },
    [circuit, catalog, pads, routing],
  );

  const rotateComponent = useCallback(
    (id: string) => {
      const current = placement.placements.get(id);
      if (!current) return;
      reanchor(id, { ...current, rotation: (current.rotation + 90) % 360 });
      placement.rotateComponent(id);
    },
    [placement, reanchor],
  );

  const flipComponent = useCallback(
    (id: string) => {
      const current = placement.placements.get(id);
      if (!current) return;
      reanchor(id, { ...current, side: otherLayer(current.side) });
      placement.flipComponent(id);
    },
    [placement, reanchor],
  );

  return useMemo(
    () => ({ ...placement, ...routing, rotateComponent, flipComponent, pads, connectivity, drc, netCount, obstacles }),
    [placement, routing, rotateComponent, flipComponent, pads, connectivity, drc, netCount, obstacles],
  );
}
