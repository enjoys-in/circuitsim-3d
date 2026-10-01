import { segmentsIntersect } from "./geometry";
import type { Airwire, Layer, Point, Trace } from "./pcbTypes";
import { otherLayer } from "./pcbTypes";

export interface PlannedTrace {
  netId: string;
  layer: Layer;
  points: Point[];
}

export interface PlannedVia {
  netId: string;
  x: number;
  y: number;
}

export interface RoutePlan {
  traces: PlannedTrace[];
  vias: PlannedVia[];
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

interface Leg {
  points: Point[];
  layer: Layer;
}

interface Candidate {
  legs: Leg[];
  via: Point | null;
  cross: number;
}

// All ways to route one airwire against the given obstacles. Single-layer candidates
// come first in layer-outer order (matching the proven greedy, so the initial pass is
// reproducible); via candidates split the elbow so each leg takes its own layer.
function candidates(aw: Airwire, layers: Layer[], placed: PlacedSeg[]): Candidate[] {
  const shapes = elbows(aw.a, aw.b);
  const out: Candidate[] = [];
  for (const layer of layers) {
    for (const shape of shapes) {
      out.push({ legs: [{ points: shape, layer }], via: null, cross: crossings(shape, layer, placed, aw.netId) });
    }
  }
  for (const shape of shapes) {
    if (shape.length !== 3) continue;
    const [a, corner, b] = shape;
    const leg1 = [a, corner];
    const leg2 = [corner, b];
    for (const first of layers) {
      const second = otherLayer(first);
      out.push({
        legs: [
          { points: leg1, layer: first },
          { points: leg2, layer: second },
        ],
        via: corner,
        cross: crossings(leg1, first, placed, aw.netId) + crossings(leg2, second, placed, aw.netId),
      });
    }
  }
  return out;
}

// Fewest crossings wins; prefer no via on ties (a via costs a drilled hole).
function pickBest(cands: Candidate[]): Candidate {
  return cands.reduce((best, c) => {
    if (c.cross !== best.cross) return c.cross < best.cross ? c : best;
    return (c.via ? 1 : 0) < (best.via ? 1 : 0) ? c : best;
  });
}

interface Route {
  aw: Airwire;
  legs: Leg[];
  via: Point | null;
}

function legSegs(route: Route): PlacedSeg[] {
  const segs: PlacedSeg[] = [];
  for (const leg of route.legs) {
    for (const [a, b] of segmentsOf(leg.points)) segs.push({ a, b, layer: leg.layer, netId: route.aw.netId });
  }
  return segs;
}

function routeCross(aw: Airwire, legs: Leg[], others: PlacedSeg[]): number {
  let c = 0;
  for (const leg of legs) c += crossings(leg.points, leg.layer, others, aw.netId);
  return c;
}

// Greedy router + via-repair pass. First route every airwire single-layer (shortest
// first), picking the elbow/layer that crosses the fewest earlier traces. Then repeatedly
// reroute any trace still involved in a short — now allowed to hop layers through a via —
// accepting a change only when it strictly lowers that trace's crossings. The repair pass
// is monotonic, so vias only ever remove shorts, never add them.
export function planRoutes(airwires: Airwire[], startLayer: Layer, existing: Trace[] = []): RoutePlan {
  const layers: Layer[] = [startLayer, otherLayer(startLayer)];
  const fixed: PlacedSeg[] = [];
  for (const trace of existing) {
    for (const [a, b] of segmentsOf(trace.points)) fixed.push({ a, b, layer: trace.layer, netId: trace.netId });
  }

  const order = [...airwires].sort((a, b) => lengthSq(a) - lengthSq(b));
  const routes: Route[] = [];
  const placed = [...fixed];
  for (const aw of order) {
    const best = pickBest(candidates(aw, layers, placed).filter((c) => !c.via));
    routes.push({ aw, legs: best.legs, via: best.via });
    placed.push(...legSegs({ aw, legs: best.legs, via: best.via }));
  }

  for (let round = 0; round < 4; round++) {
    let improved = false;
    for (let i = 0; i < routes.length; i++) {
      const others = fixed.concat(...routes.filter((_, j) => j !== i).map(legSegs));
      const current = routeCross(routes[i].aw, routes[i].legs, others);
      if (current === 0) continue;
      const best = pickBest(candidates(routes[i].aw, layers, others));
      if (best.cross < current) {
        routes[i] = { aw: routes[i].aw, legs: best.legs, via: best.via };
        improved = true;
      }
    }
    if (!improved) break;
  }

  const traces: PlannedTrace[] = [];
  const vias: PlannedVia[] = [];
  for (const r of routes) {
    for (const leg of r.legs) traces.push({ netId: r.aw.netId, layer: leg.layer, points: leg.points });
    if (r.via) vias.push({ netId: r.aw.netId, x: r.via.x, y: r.via.y });
  }
  return { traces, vias };
}
