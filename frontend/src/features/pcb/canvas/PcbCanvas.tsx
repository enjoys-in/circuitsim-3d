import { useEffect, useMemo } from "react";
import { useCatalog } from "../../catalog/CatalogContext";
import { useCircuitGraph } from "../../board/CircuitGraphContext";
import type { PadInfo } from "../model/nets";
import { usePcb } from "../PcbContext";
import { Footprint } from "./Footprint";
import { DrcMarkers, Ratsnest, RoutePreview } from "./Overlays";
import { PcbZoomOverlay } from "./PcbZoomOverlay";
import { TraceLayer } from "./TraceLayer";
import { usePanZoom } from "./usePanZoom";
import { usePcbInteraction } from "./usePcbInteraction";

export function PcbCanvas() {
  const pcb = usePcb();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();
  const view = usePanZoom(pcb.board);
  const interaction = usePcbInteraction(pcb, view);
  const { board } = pcb;

  useEffect(() => view.fit(board), [board.width, board.height, view.fit]); // eslint-disable-line

  const padsByInstance = useMemo(() => {
    const map = new Map<string, PadInfo[]>();
    for (const pad of pcb.pads) map.set(pad.instanceId, [...(map.get(pad.instanceId) ?? []), pad]);
    return map;
  }, [pcb.pads]);

  const highlightNet = pcb.routing?.netId ?? null;

  return (
    <div className="pcb-canvas-wrap">
    <svg
      ref={view.svgRef}
      className="pcb-canvas"
      viewBox={view.viewBoxString}
      onPointerDown={interaction.onSvgPointerDown}
      onPointerMove={interaction.onSvgPointerMove}
      onPointerUp={interaction.onSvgPointerUp}
      onPointerLeave={interaction.onSvgPointerUp}
      onWheel={interaction.onWheel}
      onDoubleClick={interaction.onDoubleClick}
      onContextMenu={interaction.onSvgContextMenu}
    >
      <defs>
        <pattern id="pcb-grid" width={10} height={10} patternUnits="userSpaceOnUse">
          <circle cx={0.5} cy={0.5} r={0.5} className="pcb-grid__dot" />
        </pattern>
      </defs>

      <rect className="pcb-board" x={0} y={0} width={board.width} height={board.height} rx={8} />
      <rect x={0} y={0} width={board.width} height={board.height} fill="url(#pcb-grid)" pointerEvents="none" />
      <rect className="pcb-board__edge" x={4} y={4} width={board.width - 8} height={board.height - 8} rx={5} />

      <TraceLayer
        traces={pcb.traces}
        vias={pcb.vias}
        visible={pcb.visible}
        selectedTraceId={pcb.selectedTraceId}
        onTracePointerDown={interaction.onTracePointerDown}
        onTraceContextMenu={interaction.onTraceContextMenu}
        onViaContextMenu={interaction.onViaContextMenu}
      />

      {circuit.instances.map((inst) => {
        const def = byKey.get(inst.component_key);
        const placement = pcb.placements.get(inst.id);
        if (!def || !placement) return null;
        return (
          <Footprint
            key={inst.id}
            instanceId={inst.id}
            label={inst.label}
            def={def}
            placement={placement}
            pads={padsByInstance.get(inst.id) ?? []}
            selected={pcb.selectedId === inst.id}
            highlightNet={highlightNet}
            onBodyPointerDown={interaction.onBodyPointerDown}
            onPadPointerDown={interaction.onPadPointerDown}
          />
        );
      })}

      <Ratsnest airwires={pcb.connectivity.airwires} />
      {pcb.routing && <RoutePreview routing={pcb.routing} cursor={interaction.cursor} />}
      <DrcMarkers violations={pcb.drc} />
    </svg>
    <PcbZoomOverlay view={view} />
    </div>
  );
}
