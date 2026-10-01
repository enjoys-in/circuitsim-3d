import { memo, type MouseEvent, type PointerEvent } from "react";
import { polyline } from "../model/geometry";
import type { Layer, Obstacle, Trace } from "../model/pcbTypes";
import { LAYER_COLOR } from "../model/pcbTypes";

// Faint dashed "ghost" of the copper that runs underneath component bodies, drawn
// on top of the parts (which are otherwise opaque) and clipped to the part boxes.
export const UnderPartTraces = memo(function UnderPartTraces({
  traces,
  obstacles,
  visible,
}: {
  traces: Trace[];
  obstacles: Obstacle[];
  visible: Record<Layer, boolean>;
}) {
  if (obstacles.length === 0) return null;
  return (
    <>
      <defs>
        <clipPath id="pcb-under-parts" clipPathUnits="userSpaceOnUse">
          {obstacles.map((o, i) => (
            <rect key={i} x={o.minX} y={o.minY} width={o.maxX - o.minX} height={o.maxY - o.minY} />
          ))}
        </clipPath>
      </defs>
      <g className="traces-ghost pcb-no-export-handles" clipPath="url(#pcb-under-parts)">
        {traces
          .filter((t) => visible[t.layer])
          .map((t) => (
            <path
              key={t.id}
              d={polyline(t.points)}
              fill="none"
              stroke={LAYER_COLOR[t.layer]}
              strokeWidth={t.width}
              strokeOpacity={0.45}
              strokeDasharray="2 4"
              strokeLinecap="round"
            />
          ))}
      </g>
    </>
  );
});

// Draggable joints for the selected trace so users can reshape auto-routed copper.
export const TraceHandles = memo(function TraceHandles({
  trace,
  onPointerDown,
  onContextMenu,
}: {
  trace: Trace | null;
  onPointerDown: (e: PointerEvent, traceId: string, index: number) => void;
  onContextMenu: (e: MouseEvent, traceId: string, index: number) => void;
}) {
  if (!trace) return null;
  return (
    <g className="trace-handles">
      {trace.points.map((p, i) => (
        <g key={i} onPointerDown={(e) => onPointerDown(e, trace.id, i)} onContextMenu={(e) => onContextMenu(e, trace.id, i)}>
          <circle cx={p.x} cy={p.y} r={9} className="trace-handle__hit" />
          <circle cx={p.x} cy={p.y} r={4.5} className="trace-handle" />
        </g>
      ))}
    </g>
  );
});
