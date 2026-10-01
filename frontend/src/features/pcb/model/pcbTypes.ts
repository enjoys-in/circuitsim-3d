export type Layer = "top" | "bottom";

export interface Point {
  x: number;
  y: number;
}

export type PadShape = "round" | "rect" | "smd";

export interface Pad {
  name: string;
  x: number;
  y: number;
  shape: PadShape;
}

export interface Footprint {
  width: number;
  height: number;
  pads: Pad[];
  outline: "box" | "circle" | "polar";
}

export interface Placement {
  x: number;
  y: number;
  rotation: number;
  side: Layer;
  bodyW?: number;
  bodyH?: number;
  padScale?: number;
  padAngle?: number;
  pads?: Record<string, PadOverride>;
}

export interface PadOverride {
  w?: number;
  h?: number;
  angle?: number;
}

export interface Trace {
  id: string;
  netId: string;
  layer: Layer;
  width: number;
  points: Point[];
}

export interface Via {
  id: string;
  netId: string;
  x: number;
  y: number;
}

export interface RoutingSession {
  netId: string;
  layer: Layer;
  points: Point[];
  from: string;
}

export interface Board {
  width: number;
  height: number;
}

export interface Airwire {
  netId: string;
  a: Point;
  b: Point;
}

export interface DrcViolation {
  id: string;
  kind: "clearance" | "short" | "unrouted" | "overlap";
  message: string;
  at?: Point;
}

export const GRID = 10;
export const DEFAULT_TRACE_WIDTH = 4;
export const VIA_RADIUS = 4;
export const PAD_HIT_RADIUS = 7;
export const CLEARANCE = 3;

// Board/pad geometry is kept in abstract units; expose them to users as millimetres.
export const UNITS_PER_MM = 4;
export const ROUND_PAD = 10;
export const RECT_PAD = 11;

export const toMm = (units: number): number => Math.round((units / UNITS_PER_MM) * 10) / 10;
export const fromMm = (value: number): number => Math.round(value * UNITS_PER_MM);

export const LAYER_COLOR: Record<Layer, string> = {
  top: "#e0533f",
  bottom: "#3f7de0",
};

export function otherLayer(layer: Layer): Layer {
  return layer === "top" ? "bottom" : "top";
}

export function padId(instanceId: string, padName: string): string {
  return `${instanceId}:${padName}`;
}
