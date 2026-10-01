import { memo, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from "@xyflow/react";
import { formatSI } from "../../../shared/lib/format";
import type { Position } from "../../../domain";
import { useLiveNet } from "../../simulation/SimulationContext";
import { useCircuitActions } from "../CircuitGraphContext";
import type { WireEdgeType } from "../nodes/types";

const DIGITAL_ENGINES = new Set(["digital"]);
const ENERGIZED_VOLTS = 0.5;

function describe(engine: string | null, value: number | null | undefined): { active: boolean; text: string | null } {
  if (value === undefined || value === null || engine === null) return { active: false, text: null };
  if (DIGITAL_ENGINES.has(engine)) return { active: value === 1, text: String(value) };
  return { active: value > ENERGIZED_VOLTS, text: formatSI(value, "V") };
}

function polyline(points: Position[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
}

// Distance from p to segment ab, so a new joint drops onto the nearest leg of the wire.
function distToSegment(p: Position, a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function WireEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<WireEdgeType>) {
  const { screenToFlowPosition } = useReactFlow();
  const { setWaypoints } = useCircuitActions();
  const dragIndex = useRef<number | null>(null);
  const waypoints = data?.waypoints ?? [];
  const { engine, value } = useLiveNet(id);
  const { active, text } = describe(engine, value);
  const color = data?.color ?? "#22c55e";

  let path: string;
  let labelX: number;
  let labelY: number;
  if (waypoints.length > 0) {
    const pts: Position[] = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
    path = polyline(pts);
    const mid = pts[Math.floor(pts.length / 2)];
    labelX = mid.x;
    labelY = mid.y;
  } else {
    [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  }

  // Double-click the wire to drop a joint on the nearest leg.
  const addJoint = (e: ReactMouseEvent) => {
    e.stopPropagation();
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const point: Position = { x: Math.round(p.x), y: Math.round(p.y) };
    const pts: Position[] = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
    let at = 0;
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(point, pts[i], pts[i + 1]);
      if (d < best) {
        best = d;
        at = i;
      }
    }
    const next = [...waypoints];
    next.splice(at, 0, point);
    setWaypoints(id, next);
  };

  const onJointDown = (e: ReactPointerEvent, index: number) => {
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* pointer not capturable — dragging still works via move/up */
    }
    dragIndex.current = index;
  };
  const onJointMove = (e: ReactPointerEvent) => {
    if (dragIndex.current === null) return;
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const moved = { x: Math.round(p.x), y: Math.round(p.y) };
    setWaypoints(id, waypoints.map((w, i) => (i === dragIndex.current ? moved : w)));
  };
  const onJointUp = (e: ReactPointerEvent) => {
    dragIndex.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };
  // Double-click a joint to remove it.
  const removeJoint = (e: ReactMouseEvent, index: number) => {
    e.stopPropagation();
    setWaypoints(id, waypoints.filter((_, i) => i !== index));
  };

  return (
    <g className="wire" onDoubleClick={addJoint}>
      <path d={path} className="wire__shadow" />
      <BaseEdge id={id} path={path} interactionWidth={18} style={{ stroke: color }} className="wire__body" />
      <path d={path} className="wire__shine" />
      {active && <path d={path} className="wire__flow" />}
      {selected && <path d={path} className="wire__selected" />}
      {waypoints.map((w, i) => (
        <circle
          key={i}
          cx={w.x}
          cy={w.y}
          r={5}
          className="wire__joint"
          onPointerDown={(e) => onJointDown(e, i)}
          onPointerMove={onJointMove}
          onPointerUp={onJointUp}
          onDoubleClick={(e) => removeJoint(e, i)}
        />
      ))}
      {text && (selected || active) && (
        <EdgeLabelRenderer>
          <span className="wire__label" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            {text}
          </span>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

export const WireEdge = memo(WireEdgeImpl);
