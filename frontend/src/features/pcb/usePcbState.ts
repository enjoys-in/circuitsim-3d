import { useMemo } from "react";
import type { Circuit, ComponentDef } from "../../domain";
import { runDrc } from "./model/drc";
import { analyzeNets, collectPads, type Connectivity, type PadInfo } from "./model/nets";
import type { DrcViolation } from "./model/pcbTypes";
import { usePlacements, type PlacementController } from "./usePlacements";
import { useRouting, type RoutingController } from "./useRouting";

export interface PcbState extends PlacementController, RoutingController {
  pads: PadInfo[];
  connectivity: Connectivity;
  drc: DrcViolation[];
  netCount: number;
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

  const drc = useMemo(
    () => runDrc(routing.traces, placement.board, connectivity.routedNets, netCount),
    [routing.traces, placement.board, connectivity.routedNets, netCount],
  );

  return useMemo(
    () => ({ ...placement, ...routing, pads, connectivity, drc, netCount }),
    [placement, routing, pads, connectivity, drc, netCount],
  );
}
