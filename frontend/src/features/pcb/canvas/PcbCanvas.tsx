import { useEffect, useMemo, useRef, type DragEvent } from "react";
import { useCatalog } from "../../catalog/CatalogContext";
import { useCircuitActions, useCircuitGraph } from "../../board/CircuitGraphContext";
import { DRAG_MIME } from "../../../shared/constants";
import { readPreset } from "../../parts/dragPayload";
import type { PadInfo } from "../model/nets";
import type { Point } from "../model/pcbTypes";
import { usePcb } from "../PcbContext";
import { Footprint, type PcbRenderMode } from "./Footprint";
import { DrcMarkers, Ratsnest, RoutePreview } from "./Overlays";
import { PcbZoomOverlay } from "./PcbZoomOverlay";
import { SelectionHandles } from "./SelectionHandles";
import { TraceLayer } from "./TraceLayer";
import { TraceHandles, UnderPartTraces } from "./TraceEditing";
import { usePanZoom } from "./usePanZoom";
import { usePcbInteraction } from "./usePcbInteraction";

export function PcbCanvas({ render }: { render: PcbRenderMode }) {
  const pcb = usePcb();
  const { circuit } = useCircuitGraph();
  const { addPart } = useCircuitActions();
  const { byKey } = useCatalog();
  const view = usePanZoom(pcb.board);
  const interaction = usePcbInteraction(pcb, view);
  const { board } = pcb;

  useEffect(() => view.fit(board), [board.width, board.height, view.fit]); // eslint-disable-line

  // A dropped part only gets a placement once the circuit re-derives; move it to
  // the drop point as soon as that placement exists.
  const pending = useRef<{ id: string; point: Point } | null>(null);
  useEffect(() => {
    const p = pending.current;
    if (p && pcb.placements.has(p.id)) {
      pcb.moveComponent(p.id, p.point);
      pcb.selectComponent(p.id);
      pending.current = null;
    }
  }, [pcb]);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const def = byKey.get(e.dataTransfer.getData(DRAG_MIME));
    if (!def) return;
    const preset = readPreset(e.dataTransfer);
    const point = view.toBoard(e.clientX, e.clientY);
    const id = addPart(def, { params: preset?.params, label: preset?.name });
    pending.current = { id, point };
  };

  const padsByInstance = useMemo(() => {
    const map = new Map<string, PadInfo[]>();
    for (const pad of pcb.pads) map.set(pad.instanceId, [...(map.get(pad.instanceId) ?? []), pad]);
    return map;
  }, [pcb.pads]);

  const highlightNet = pcb.highlightedNetId ?? pcb.routing?.netId ?? null;

  const selectedFootprint = (() => {
    const id = pcb.selectedId;
    if (!id) return null;
    const inst = circuit.instances.find((i) => i.id === id);
    const def = inst && byKey.get(inst.component_key);
    const placement = pcb.placements.get(id);
    return inst && def && placement ? { id, def, placement } : null;
  })();

  return (
    <div className="pcb-canvas-wrap" onDrop={onDrop} onDragOver={onDragOver}>
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
        highlightNet={highlightNet}
        onTracePointerDown={interaction.onTracePointerDown}
        onTraceContextMenu={interaction.onTraceContextMenu}
        onTraceDoubleClick={interaction.onTraceDoubleClick}
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
            params={inst.params}
            placement={placement}
            pads={padsByInstance.get(inst.id) ?? []}
            selected={pcb.selectedId === inst.id}
            selectedPadId={pcb.selectedPadId}
            render={render}
            highlightNet={highlightNet}
            onBodyPointerDown={interaction.onBodyPointerDown}
            onPadPointerDown={interaction.onPadPointerDown}
          />
        );
      })}

      {selectedFootprint && (
        <SelectionHandles
          instanceId={selectedFootprint.id}
          placement={selectedFootprint.placement}
          def={selectedFootprint.def}
          onRotate={() => pcb.rotateComponent(selectedFootprint.id)}
          onFlip={() => pcb.flipComponent(selectedFootprint.id)}
          onResizePointerDown={interaction.onResizePointerDown}
        />
      )}

      <UnderPartTraces traces={pcb.traces} obstacles={pcb.obstacles} visible={pcb.visible} />
      <TraceHandles
        trace={pcb.traces.find((t) => t.id === pcb.selectedTraceId) ?? null}
        onPointerDown={interaction.onWaypointPointerDown}
        onContextMenu={interaction.onWaypointContextMenu}
      />

      <Ratsnest airwires={pcb.connectivity.airwires} highlightNet={highlightNet} />
      {pcb.routing && <RoutePreview routing={pcb.routing} cursor={interaction.cursor} />}
      <DrcMarkers violations={pcb.drc} />
    </svg>
    <PcbZoomOverlay view={view} />
    </div>
  );
}
