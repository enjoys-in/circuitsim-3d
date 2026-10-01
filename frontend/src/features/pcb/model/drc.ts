import { segmentDistance, segmentsIntersect } from "./geometry";
import type { Board, DrcViolation, Point, Trace } from "./pcbTypes";
import { CLEARANCE } from "./pcbTypes";

interface Segment {
  netId: string;
  layer: string;
  width: number;
  a: Point;
  b: Point;
}

function toSegments(traces: Trace[]): Segment[] {
  const segments: Segment[] = [];
  for (const trace of traces) {
    for (let i = 0; i < trace.points.length - 1; i++) {
      segments.push({
        netId: trace.netId,
        layer: trace.layer,
        width: trace.width,
        a: trace.points[i],
        b: trace.points[i + 1],
      });
    }
  }
  return segments;
}

export function runDrc(
  traces: Trace[],
  board: Board,
  routedNets: Set<string>,
  netCount: number,
): DrcViolation[] {
  const violations: DrcViolation[] = [];
  const segments = toSegments(traces);

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s = segments[i];
      const t = segments[j];
      if (s.layer !== t.layer || s.netId === t.netId) continue;
      const crossing = segmentsIntersect(s.a, s.b, t.a, t.b);
      const gap = crossing ? -1 : segmentDistance(s.a, s.b, t.a, t.b) - (s.width + t.width) / 2;
      const at = { x: (s.a.x + t.b.x) / 2, y: (s.a.y + t.b.y) / 2 };
      if (gap < 0) {
        // Different-net copper physically overlaps on one layer = hard short.
        violations.push({
          id: `short-${i}-${j}`,
          kind: "short",
          message: `Short — ${s.layer} traces on different nets overlap`,
          at,
        });
      } else if (gap < CLEARANCE) {
        violations.push({
          id: `clearance-${i}-${j}`,
          kind: "clearance",
          message: `Traces on ${s.layer} are too close (${gap.toFixed(1)} < ${CLEARANCE} px)`,
          at,
        });
      }
    }
  }

  for (const trace of traces) {
    for (const point of trace.points) {
      if (point.x < 0 || point.y < 0 || point.x > board.width || point.y > board.height) {
        violations.push({ id: `oob-${trace.id}`, kind: "overlap", message: "A trace runs off the board", at: point });
        break;
      }
    }
  }

  const unrouted = netCount - routedNets.size;
  if (unrouted > 0) {
    violations.push({
      id: "unrouted",
      kind: "unrouted",
      message: `${unrouted} net${unrouted === 1 ? "" : "s"} still ${unrouted === 1 ? "has" : "have"} unrouted connections`,
    });
  }
  return violations;
}
