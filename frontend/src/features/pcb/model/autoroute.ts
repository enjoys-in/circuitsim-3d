import { segmentsIntersect } from "./geometry";
import type { Airwire, Layer, Obstacle, Point, Trace } from "./pcbTypes";
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

// Clearance kept when detouring a trace around a component body.
const BODY_GAP = 14;

// The two L-shaped elbows between a and b (horizontal-first, vertical-first).
// A straight run needs no elbow.
function elbows(a: Point, b: Point): Point[][] {
  if (a.x === b.x || a.y === b.y) return [[a, b]];
  return [
    [a, { x: b.x, y: a.y }, b],
    [a, { x: a.x, y: b.y }, b],
  ];
}

// Candidate orthogonal routes: straight, both L-elbows, and Z-detours whose middle leg
// runs just outside a component edge — enough for the router to fold around parts.
function orthoPaths(a: Point, b: Point, obstacles: Obstacle[]): Point[][] {
  const paths: Point[][] = [...elbows(a, b)];
  const loX = Math.min(a.x, b.x);
  const hiX = Math.max(a.x, b.x);
  const loY = Math.min(a.y, b.y);
  const hiY = Math.max(a.y, b.y);
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const box of obstacles) {
    if (box.maxX < loX - BODY_GAP || box.minX > hiX + BODY_GAP) continue;
    if (box.maxY < loY - BODY_GAP || box.minY > hiY + BODY_GAP) continue;
    xs.add(box.minX - BODY_GAP);
    xs.add(box.maxX + BODY_GAP);
    ys.add(box.minY - BODY_GAP);
    ys.add(box.maxY + BODY_GAP);
  }
  for (const x of xs) paths.push([a, { x, y: a.y }, { x, y: b.y }, b]);
  for (const y of ys) paths.push([a, { x: a.x, y }, { x: b.x, y }, b]);
  return paths.map(simplify);
}

// Drop duplicate and collinear vertices so each route keeps only its real 90° folds.
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
  }
  for (let i = out.length - 2; i >= 1; i--) {
    const a = out[i - 1];
    const c = out[i + 1];
    if ((a.x === out[i].x && out[i].x === c.x) || (a.y === out[i].y && out[i].y === c.y)) out.splice(i, 1);
  }
  return out.length >= 2 ? out : points;
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

function pointInBox(p: Point, box: Obstacle): boolean {
  return p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
}

// Orthogonal segment vs box overlap (every router segment is horizontal or vertical).
function segmentHitsBox(p: Point, q: Point, box: Obstacle): boolean {
  if (p.y === q.y) {
    const lo = Math.min(p.x, q.x);
    const hi = Math.max(p.x, q.x);
    return p.y >= box.minY && p.y <= box.maxY && lo <= box.maxX && hi >= box.minX;
  }
  const lo = Math.min(p.y, q.y);
  const hi = Math.max(p.y, q.y);
  return p.x >= box.minX && p.x <= box.maxX && lo <= box.maxY && hi >= box.minY;
}

// Times a route passes under a component it does not connect to (the mess to avoid). A
// part the route starts or ends inside is skipped — the trace must reach its own pad.
function bodyHits(points: Point[], obstacles: Obstacle[], aw: Airwire): number {
  let hits = 0;
  for (const [p, q] of segmentsOf(points)) {
    for (const box of obstacles) {
      if (pointInBox(aw.a, box) || pointInBox(aw.b, box)) continue;
      if (segmentHitsBox(p, q, box)) hits++;
    }
  }
  return hits;
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (const [p, q] of segmentsOf(points)) len += Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
  return len;
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
  cost: number;
}

// Combined routing cost. Shorts dominate everything (never trade a short for looks), then
// avoid component bodies, then prefer fewer folds and shorter copper; a via costs a little.
function score(legs: Leg[], via: Point | null, cross: number, aw: Airwire, obstacles: Obstacle[]): Candidate {
  let body = 0;
  let bends = 0;
  let len = 0;
  for (const leg of legs) {
    body += bodyHits(leg.points, obstacles, aw);
    bends += Math.max(0, leg.points.length - 2);
    len += pathLength(leg.points);
  }
  const cost = cross * 1000 + body * 40 + bends * 3 + len * 0.002 + (via ? 5 : 0);
  return { legs, via, cross, cost };
}

// Candidate routes for one airwire: every detour shape single-layer, plus via layer-hops
// at a plain L-corner so each leg can take its own copper.
function candidates(aw: Airwire, layers: Layer[], placed: PlacedSeg[], obstacles: Obstacle[]): Candidate[] {
  const shapes = orthoPaths(aw.a, aw.b, obstacles);
  const out: Candidate[] = [];
  for (const layer of layers) {
    for (const shape of shapes) {
      out.push(score([{ points: shape, layer }], null, crossings(shape, layer, placed, aw.netId), aw, obstacles));
    }
  }
  for (const shape of shapes) {
    if (shape.length !== 3) continue;
    const [a, corner, b] = shape;
    const leg1 = [a, corner];
    const leg2 = [corner, b];
    for (const first of layers) {
      const second = otherLayer(first);
      const cross = crossings(leg1, first, placed, aw.netId) + crossings(leg2, second, placed, aw.netId);
      out.push(
        score(
          [
            { points: leg1, layer: first },
            { points: leg2, layer: second },
          ],
          corner,
          cross,
          aw,
          obstacles,
        ),
      );
    }
  }
  return out;
}

// Cleanest overall route (shorts, then bodies, then folds/length) — used for routing.
function pickByCost(cands: Candidate[]): Candidate {
  return cands.reduce((best, c) => (c.cost < best.cost ? c : best));
}

// Fewest shorts wins, then fewer vias, then cleaner — used by the monotonic repair pass.
function pickByCross(cands: Candidate[]): Candidate {
  return cands.reduce((best, c) => {
    if (c.cross !== best.cross) return c.cross < best.cross ? c : best;
    if ((c.via ? 1 : 0) !== (best.via ? 1 : 0)) return (c.via ? 1 : 0) < (best.via ? 1 : 0) ? c : best;
    return c.cost < best.cost ? c : best;
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
// first), choosing the elbow/detour/layer that is cleanest — fewest shorts, then fewest
// passes under other components, then fewest 90° folds. Then reroute any trace still
// involved in a short, now allowed to hop layers through a via, accepting a change only
// when it strictly lowers that trace's shorts. The repair pass is monotonic, so it never
// adds shorts.
export function planRoutes(
  airwires: Airwire[],
  startLayer: Layer,
  existing: Trace[] = [],
  obstacles: Obstacle[] = [],
): RoutePlan {
  const layers: Layer[] = [startLayer, otherLayer(startLayer)];
  const fixed: PlacedSeg[] = [];
  for (const trace of existing) {
    for (const [a, b] of segmentsOf(trace.points)) fixed.push({ a, b, layer: trace.layer, netId: trace.netId });
  }

  const order = [...airwires].sort((a, b) => lengthSq(a) - lengthSq(b));
  const routes: Route[] = [];
  const placed = [...fixed];
  for (const aw of order) {
    const best = pickByCost(candidates(aw, layers, placed, obstacles).filter((c) => !c.via));
    routes.push({ aw, legs: best.legs, via: best.via });
    placed.push(...legSegs({ aw, legs: best.legs, via: best.via }));
  }

  for (let round = 0; round < 4; round++) {
    let improved = false;
    for (let i = 0; i < routes.length; i++) {
      const others = fixed.concat(...routes.filter((_, j) => j !== i).map(legSegs));
      const current = routeCross(routes[i].aw, routes[i].legs, others);
      if (current === 0) continue;
      const best = pickByCross(candidates(routes[i].aw, layers, others, obstacles));
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
