import type { ComponentDef, Pin } from "../../../domain";
import { getPart } from "../../parts";
import type { PartPin } from "../../parts";
import { BREADBOARD_KEY, getBreadboardLayout } from "../../parts/library/breadboardModel";
import type { Footprint, Pad, PadShape } from "./pcbTypes";

const PITCH = 30;
const ROW_GAP = 60;
const MARGIN = 18;

// The footprint is the part art projected into board space: pads sit exactly where the
// art draws each pin, scaled uniformly so the art renders without distortion. The scale
// turns the art's tight 16px header pitch into a comfortable through-hole pitch.
const FOOTPRINT_SCALE = 1.6;

function shapeFor(index: number, base: PadShape): Pad[][number]["shape"] {
  return index === 0 ? "rect" : base;
}

function fit(pads: Pad[], outline: Footprint["outline"]): Footprint {
  const xs = pads.map((p) => p.x);
  const ys = pads.map((p) => p.y);
  const width = Math.max(...xs) + MARGIN;
  const height = Math.max(...ys) + MARGIN;
  return { width, height, pads, outline };
}

function inline(pins: Pin[], base: PadShape = "round"): Footprint {
  const pads = pins.map((pin, i) => ({
    name: pin.name,
    x: MARGIN + i * PITCH,
    y: MARGIN,
    shape: shapeFor(i, base),
  }));
  return fit(pads, "box");
}

function dual(pins: Pin[]): Footprint {
  const half = Math.ceil(pins.length / 2);
  const pads = pins.map((pin, i) => {
    const bottom = i >= half;
    const col = bottom ? pins.length - 1 - i : i;
    return {
      name: pin.name,
      x: MARGIN + col * PITCH,
      y: MARGIN + (bottom ? ROW_GAP : 0),
      shape: shapeFor(i, "round"),
    };
  });
  return fit(pads, "box");
}

function twoTerminal(pins: Pin[]): Footprint {
  const pads: Pad[] = [
    { name: pins[0]?.name ?? "a", x: MARGIN, y: MARGIN, shape: "rect" },
    { name: pins[1]?.name ?? "b", x: MARGIN + PITCH * 2, y: MARGIN, shape: "round" },
  ];
  return fit(pads, "box");
}

function boardFootprint(pins: Pin[]): Footprint {
  return pins.length > 6 ? dual(pins) : inline(pins);
}

// Generic layout used when the part art does not position every pin (keeps connectivity
// for parts whose art and schematic pins disagree).
function genericFootprint(def: ComponentDef): Footprint {
  if (def.pins.length === 0) return { width: 220, height: 140, pads: [], outline: "box" };
  if (def.pins.length === 2) return twoTerminal(def.pins);
  if (def.category === "logic") return dual(def.pins);
  if (def.category === "dev_board") return dual(def.pins);
  if (def.pins.length <= 3) return inline(def.pins);
  return boardFootprint(def.pins);
}

// Footprint whose pads coincide with the part art's drawn pins, so copper lines up with
// the body in every orientation (a vertical board gets vertical pad columns, etc.).
function footprintFromArt(def: ComponentDef, width: number, height: number, artPins: Map<string, PartPin>): Footprint {
  const pads: Pad[] = def.pins.map((pin, i) => {
    const art = artPins.get(pin.name)!;
    return {
      name: pin.name,
      x: art.x * FOOTPRINT_SCALE,
      y: art.y * FOOTPRINT_SCALE,
      shape: shapeFor(i, "round"),
    };
  });
  return { width: width * FOOTPRINT_SCALE, height: height * FOOTPRINT_SCALE, pads, outline: "box" };
}

export function buildFootprint(def: ComponentDef): Footprint {
  if (def.key === BREADBOARD_KEY) return breadboardFootprint();

  // Prefer the art's own pin geometry when it covers every pin — this keeps the pads
  // aligned with the rendered body. Otherwise fall back to a generic grid.
  if (def.pins.length > 0) {
    const spec = getPart(def);
    const artPins = new Map(spec.pins.map((p) => [p.name, p]));
    if (def.pins.every((p) => artPins.has(p.name))) {
      return footprintFromArt(def, spec.width, spec.height, artPins);
    }
  }
  return genericFootprint(def);
}

// The breadboard carries no def.pins; derive its pad grid from the hole layout.
function breadboardFootprint(): Footprint {
  const bb = getBreadboardLayout();
  const pads: Pad[] = bb.holes.map((h) => ({
    name: h.name,
    x: h.x,
    y: h.y,
    shape: h.kind === "term" ? "round" : "rect",
  }));
  return { width: bb.width, height: bb.height, pads, outline: "box" };
}

const cache = new Map<string, Footprint>();

export function getFootprint(def: ComponentDef): Footprint {
  const key = `${def.key}:${def.pins.map((p) => p.name).join(",")}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const footprint = buildFootprint(def);
  cache.set(key, footprint);
  return footprint;
}
