import { memo, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from "@xyflow/react";
import { formatSI } from "../../../shared/lib/format";
import type { Position } from "../../../domain";
import { useLiveNet, useLiveState } from "../../simulation/SimulationContext";
import { useCircuitActions } from "../CircuitGraphContext";
import type { WireEdgeType } from "../nodes/types";

const DIGITAL_ENGINES = new Set(["digital"]);
const ENERGIZED_VOLTS = 0.5;

// Map a branch current to a flow-dot speed (faster for more current) and colour
// (cyan at low current, through amber, to red at high current).
function flowDuration(amps: number): number {
  const s = Math.min(Math.abs(amps) / 0.02, 4);
  return Math.max(0.25, 1.2 / (0.3 + s));
}
function flowColor(amps: number): string {
  const s = Math.min(Math.abs(amps) / 0.02, 4) / 4;
  return `hsl(${Math.round(190 - 170 * s)}, 90%, 62%)`;
}

// Map a node voltage to a blue(low)->red(high) heat colour, referenced to 12 V.
function heatColor(volts: number | null | undefined): string {
  if (volts === null || volts === undefined) return "#334155";
  const s = Math.min(Math.abs(volts) / 12, 1);
  return `hsl(${Math.round(220 - 220 * s)}, 85%, 58%)`;
}

function describe(engine: string | null, value: number | null | undefined): { active: boolean; text: string | null } {
  if (value === undefined || value === null || engine === null) return { active: false, text: null };
  if (DIGITAL_ENGINES.has(engine)) return { active: value === 1, text: String(value) };
  return { active: value > ENERGIZED_VOLTS, text: formatSI(value, "V") };
}

// Smooth curve through all points (Catmull-Rom -> cubic bezier), so joined wires bend
// gently instead of making sharp corners.
function smoothPath(points: Position[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
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
  source,
  target,
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
  const { instances } = useLiveState();
  const branchCurrent = Math.max(
    Math.abs(instances[source]?.current ?? 0),
    Math.abs(instances[target]?.current ?? 0),
  );
  const { active, text } = describe(engine, value);
  const color = data?.color ?? "#22c55e";

  let path: string;
  let labelX: number;
  let labelY: number;
  if (waypoints.length > 0) {
    const pts: Position[] = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
    path = smoothPath(pts);
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
    <g className="wire" onDoubleClick={addJoint} style={{ ["--heat" as string]: heatColor(value) } as CSSProperties}>
      <path d={path} className="wire__shadow" />
      <BaseEdge id={id} path={path} interactionWidth={18} style={{ stroke: color }} className="wire__body" />
      <path d={path} className="wire__shine" />
      {active && <path d={path} className="wire__flow" />}
      {branchCurrent > 0 && (
        <path
          d={path}
          className="wire__current"
          style={{ stroke: flowColor(branchCurrent), animationDuration: `${flowDuration(branchCurrent)}s` }}
        />
      )}
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
