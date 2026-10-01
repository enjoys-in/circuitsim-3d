import { segmentsIntersect } from "./geometry";
import type { Airwire, Layer, Point, Trace } from "./pcbTypes";
import { otherLayer } from "./pcbTypes";

export interface PlannedTrace {
  netId: string;
  layer: Layer;
  points: Point[];
}

interface PlacedSeg {
  a: Point;
  b: Point;
  layer: Layer;
  netId: string;
}

// The two L-shaped elbows between a and b (horizontal-first, vertical-first).
// A straight run needs no elbow.
function elbows(a: Point, b: Point): Point[][] {
  if (a.x === b.x || a.y === b.y) return [[a, b]];
  return [
    [a, { x: b.x, y: a.y }, b],
    [a, { x: a.x, y: b.y }, b],
  ];
}

function segmentsOf(points: Point[]): [Point, Point][] {
  const out: [Point, Point][] = [];
  for (let i = 0; i < points.length - 1; i++) out.push([points[i], points[i + 1]]);
  return out;
}

// How many placed, different-net segments on this layer the candidate would cross
// (each crossing is a DRC short).
function crossings(points: Point[], layer: Layer, placed: PlacedSeg[], netId: string): number {
  let count = 0;
  const segs = segmentsOf(points);
  for (const s of placed) {
    if (s.layer !== layer || s.netId === netId) continue;
    for (const [p, q] of segs) if (segmentsIntersect(p, q, s.a, s.b)) count++;
  }
  return count;
}

function lengthSq(aw: Airwire): number {
  const dx = aw.a.x - aw.b.x;
  const dy = aw.a.y - aw.b.y;
  return dx * dx + dy * dy;
}

// Greedy conflict-avoiding router: route the shortest airwires first and, for each,
// pick the elbow direction + copper layer that crosses the fewest existing different-net
// traces. Far fewer shorts than fixed top/bottom alternation, without a full maze solver.
export function planRoutes(airwires: Airwire[], startLayer: Layer, existing: Trace[] = []): PlannedTrace[] {
  const layers: Layer[] = [startLayer, otherLayer(startLayer)];
  const placed: PlacedSeg[] = [];
  for (const trace of existing) {
    for (const [a, b] of segmentsOf(trace.points)) {
      placed.push({ a, b, layer: trace.layer, netId: trace.netId });
    }
  }

  const planned: PlannedTrace[] = [];
  const order = [...airwires].sort((a, b) => lengthSq(a) - lengthSq(b));
  for (const aw of order) {
    const shapes = elbows(aw.a, aw.b);
    let best: { points: Point[]; layer: Layer; score: number } | null = null;
    for (const layer of layers) {
      for (const points of shapes) {
        const score = crossings(points, layer, placed, aw.netId);
        if (!best || score < best.score) best = { points, layer, score };
        if (best.score === 0) break;
      }
      if (best && best.score === 0) break;
    }
    if (!best) continue;
    planned.push({ netId: aw.netId, layer: best.layer, points: best.points });
    for (const [a, b] of segmentsOf(best.points)) {
      placed.push({ a, b, layer: best.layer, netId: aw.netId });
    }
  }
  return planned;
}
