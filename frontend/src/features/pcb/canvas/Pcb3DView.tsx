import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { cx } from "../../../shared/lib/format";
import { usePcb } from "../PcbContext";
import { Footprint } from "./Footprint";
import type { PadInfo } from "../model/nets";
import { TraceLayer } from "./TraceLayer";
import { useCatalog } from "../../catalog/CatalogContext";
import { useCircuitGraph } from "../../board/CircuitGraphContext";

const PAD = 40;
const noop = (e: MouseEvent) => e.preventDefault();

interface LayerProps {
  z: number;
  label: string;
  viewBox: string;
  width: number;
  height: number;
  children: ReactNode;
}

function Layer({ z, label, viewBox, width, height, children }: LayerProps) {
  return (
    <div className="pcb3d__layer" style={{ transform: `translateZ(${z}px)` }}>
      <svg viewBox={viewBox} width={width} height={height}>
        {children}
      </svg>
      <span className="pcb3d__tag">{label}</span>
    </div>
  );
}

export function Pcb3DView() {
  const pcb = usePcb();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();
  const [exploded, setExploded] = useState(true);
  const { board } = pcb;

  const viewBox = `${-PAD} ${-PAD} ${board.width + PAD * 2} ${board.height + PAD * 2}`;
  const aspect = (board.height + PAD * 2) / (board.width + PAD * 2);
  const width = 760;
  const height = width * aspect;
  const gap = exploded ? 70 : 10;

  const padsByInstance = useMemo(() => {
    const map = new Map<string, PadInfo[]>();
    for (const pad of pcb.pads) map.set(pad.instanceId, [...(map.get(pad.instanceId) ?? []), pad]);
    return map;
  }, [pcb.pads]);

  const sceneRef = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: 58, z: -28 });
  const [zoom, setZoom] = useState(0.82);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  // Native non-passive wheel so scroll zooms the board instead of the page.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(2.4, Math.max(0.3, z - e.deltaY * 0.0012)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setRot((r) => ({ x: Math.min(89, Math.max(0, r.x - dy * 0.4)), z: r.z + dx * 0.4 }));
  };
  const endDrag = () => {
    dragStart.current = null;
    setDragging(false);
  };
  const resetView = () => {
    setRot({ x: 58, z: -28 });
    setZoom(0.82);
  };

  const board2d = (
    <>
      <rect className="pcb-board" x={0} y={0} width={board.width} height={board.height} rx={8} />
      <rect className="pcb-board__edge" x={4} y={4} width={board.width - 8} height={board.height - 8} rx={5} />
    </>
  );

  return (
    <div className="pcb3d">
      <div className="pcb3d__controls">
        <button type="button" className="btn btn--sm" onClick={() => setExploded((e) => !e)}>
          {exploded ? "Stack layers" : "Explode layers"}
        </button>
        <button type="button" className="btn btn--sm" onClick={resetView}>
          Reset view
        </button>
        <span className="pcb3d__hint">drag to orbit · scroll to zoom</span>
      </div>
      <div
        ref={sceneRef}
        className={cx("pcb3d__scene", dragging && "pcb3d__scene--dragging")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="pcb3d__board"
          style={{
            transform: `rotateX(${rot.x}deg) rotateZ(${rot.z}deg) scale(${zoom})`,
            transition: dragging ? "none" : undefined,
          }}
        >
          <Layer z={-gap} label="Bottom copper" viewBox={viewBox} width={width} height={height}>
            {board2d}
            <TraceLayer
              traces={pcb.traces}
              vias={pcb.vias}
              visible={{ top: false, bottom: true }}
              selectedTraceId={null}
              onTracePointerDown={noop}
              onTraceContextMenu={noop}
              onViaContextMenu={noop}
            />
          </Layer>

          <Layer z={0} label="Substrate (FR-4)" viewBox={viewBox} width={width} height={height}>
            {board2d}
          </Layer>

          <Layer z={gap} label="Top copper" viewBox={viewBox} width={width} height={height}>
            <TraceLayer
              traces={pcb.traces}
              vias={pcb.vias}
              visible={{ top: true, bottom: false }}
              selectedTraceId={null}
              onTracePointerDown={noop}
              onTraceContextMenu={noop}
              onViaContextMenu={noop}
            />
          </Layer>

          <Layer z={gap * 2} label="Components & silk" viewBox={viewBox} width={width} height={height}>
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
                  selected={false}
                  selectedPadId={null}
                  render="wire"
                  highlightNet={null}
                  onBodyPointerDown={noop}
                  onPadPointerDown={noop}
                />
              );
            })}
          </Layer>
        </div>
      </div>
    </div>
  );
}
