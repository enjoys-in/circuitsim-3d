import { GRID, type Placement, type Point } from "./pcbTypes";

export function snap(value: number, grid = GRID): number {
  return Math.round(value / grid) * grid;
}

export function snapPoint(p: Point, grid = GRID): Point {
  return { x: snap(p.x, grid), y: snap(p.y, grid) };
}

export function rotate(p: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

// A pad's absolute board coordinate given the component placement.
export function padWorld(local: Point, placement: Placement, size: { width: number; height: number }): Point {
  const centered = { x: local.x - size.width / 2, y: local.y - size.height / 2 };
  const mirrored = placement.side === "bottom" ? { x: -centered.x, y: centered.y } : centered;
  const spun = rotate(mirrored, placement.rotation);
  return { x: placement.x + spun.x, y: placement.y + spun.y };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function equalish(a: Point, b: Point, tolerance = 1): boolean {
  return distance(a, b) <= tolerance;
}

// Constrain a segment endpoint to horizontal, vertical or 45 degrees from the anchor.
export function constrain45(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < GRID / 2) return { x: from.x, y: to.y };
  if (ady < GRID / 2) return { x: to.x, y: from.y };
  const diagonal = Math.min(adx, ady);
  return { x: from.x + Math.sign(dx) * diagonal, y: from.y + Math.sign(dy) * diagonal };
}

// Shortest distance from point p to segment ab.
export function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function segmentDistance(a1: Point, a2: Point, b1: Point, b2: Point): number {
  return Math.min(
    pointToSegment(a1, b1, b2),
    pointToSegment(a2, b1, b2),
    pointToSegment(b1, a1, a2),
    pointToSegment(b2, a1, a2),
  );
}

export function polyline(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}
