import type { Circuit, ComponentDef } from "../../domain";
import { getFootprint } from "../pcb/model/footprints";
import { padWorld } from "../pcb/model/geometry";
import {
  RECT_PAD,
  ROUND_PAD,
  UNITS_PER_MM,
  VIA_RADIUS,
  type Board,
  type Placement,
  type Point,
  type Trace,
  type Via,
} from "../pcb/model/pcbTypes";
import type { ZipEntry } from "./zip";

export interface GerberInput {
  circuit: Circuit;
  catalog: ReadonlyMap<string, ComponentDef>;
  placements: Map<string, Placement>;
  board: Board;
  traces: Trace[];
  vias: Via[];
}

interface PadGeom {
  x: number;
  y: number;
  w: number;
  h: number;
  round: boolean;
  angle: number;
  side: "top" | "bottom";
  through: boolean;
  drill: number;
}

const mm = (units: number): number => units / UNITS_PER_MM;

function rectCorners(cx: number, cy: number, w: number, h: number, rotation: number): Point[] {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const local = [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ];
  return local.map((p) => ({ x: cx + p.x * cos - p.y * sin, y: cy + p.x * sin + p.y * cos }));
}

function collectPads(input: GerberInput): PadGeom[] {
  const pads: PadGeom[] = [];
  for (const inst of input.circuit.instances) {
    const def = input.catalog.get(inst.component_key);
    const placement = input.placements.get(inst.id);
    if (!def || !placement) continue;
    const fp = getFootprint(def);
    const partScale = placement.padScale ?? 1;
    const partAngle = placement.padAngle ?? 0;
    for (const pad of fp.pads) {
      const world = padWorld({ x: pad.x, y: pad.y }, placement, fp);
      const override = placement.pads?.[pad.name];
      const round = pad.shape === "round";
      const smd = pad.shape === "smd";
      const base = round ? ROUND_PAD : RECT_PAD;
      pads.push({
        x: world.x,
        y: world.y,
        w: override?.w ?? base * partScale,
        h: override?.h ?? base * partScale,
        round,
        angle: (placement.rotation + (override?.angle ?? partAngle)) % 360,
        side: placement.side,
        through: !smd,
        drill: smd ? 0 : 4 * partScale,
      });
    }
  }
  return pads;
}

// Build the set of Gerber/Excellon files for the current PCB. RS-274X, millimetres,
// 3.4 coordinate format, Y flipped so the board origin sits at the bottom-left.
export function buildGerbers(input: GerberInput): ZipEntry[] {
  const { board, traces, vias, circuit, catalog, placements } = input;
  const pads = collectPads(input);

  const mmX = (u: number) => u / UNITS_PER_MM;
  const mmY = (u: number) => (board.height - u) / UNITS_PER_MM;
  const g = (valueMm: number) => Math.round(valueMm * 1e4).toString();
  const coord = (ux: number, uy: number) => `X${g(mmX(ux))}Y${g(mmY(uy))}`;
  const fmt = (n: number) => Number(n.toFixed(4)).toString();

  function newGerber(fnAttr: string) {
    const apertures = new Map<string, number>();
    const defs: string[] = [];
    const body: string[] = [];
    let next = 10;
    const aperture = (key: string, make: (d: number) => string): number => {
      const found = apertures.get(key);
      if (found) return found;
      const d = next++;
      apertures.set(key, d);
      defs.push(make(d));
      return d;
    };
    const circle = (diaMm: number) => aperture(`C${fmt(diaMm)}`, (d) => `%ADD${d}C,${fmt(diaMm)}*%`);
    const rect = (wMm: number, hMm: number) =>
      aperture(`R${fmt(wMm)}X${fmt(hMm)}`, (d) => `%ADD${d}R,${fmt(wMm)}X${fmt(hMm)}*%`);
    const flash = (d: number, ux: number, uy: number) => body.push(`D${d}*`, `${coord(ux, uy)}D03*`);
    const line = (d: number, points: Point[]) => {
      if (points.length < 2) return;
      body.push(`D${d}*`, `${coord(points[0].x, points[0].y)}D02*`);
      for (let i = 1; i < points.length; i++) body.push(`${coord(points[i].x, points[i].y)}D01*`);
    };
    const render = () =>
      [
        `%TF.FileFunction,${fnAttr}*%`,
        "%MOMM*%",
        "%FSLAX34Y34*%",
        "G01*",
        ...defs,
        ...body,
        "M02*",
      ].join("\n") + "\n";
    return { circle, rect, flash, line, render };
  }

  type Pen = ReturnType<typeof newGerber>;

  const flashPad = (pen: Pen, pad: PadGeom) => {
    if (pad.round && Math.abs(pad.w - pad.h) < 0.01) {
      pen.flash(pen.circle(mm(pad.w)), pad.x, pad.y);
      return;
    }
    const a = ((pad.angle % 180) + 180) % 180;
    const swap = a > 45 && a < 135;
    const w = swap ? pad.h : pad.w;
    const h = swap ? pad.w : pad.h;
    pen.flash(pen.rect(mm(w), mm(h)), pad.x, pad.y);
  };

  const copper = (side: "top" | "bottom", fnAttr: string): string => {
    const pen = newGerber(fnAttr);
    for (const pad of pads) if (pad.through || pad.side === side) flashPad(pen, pad);
    for (const via of vias) pen.flash(pen.circle(mm(VIA_RADIUS * 2)), via.x, via.y);
    for (const trace of traces) if (trace.layer === side) pen.line(pen.circle(mm(trace.width)), trace.points);
    return pen.render();
  };

  const mask = (side: "top" | "bottom", fnAttr: string): string => {
    const pen = newGerber(fnAttr);
    for (const pad of pads) if (pad.through || pad.side === side) flashPad(pen, pad);
    for (const via of vias) pen.flash(pen.circle(mm(VIA_RADIUS * 2)), via.x, via.y);
    return pen.render();
  };

  const silkPen = newGerber("Legend,Top");
  const silkThin = silkPen.circle(0.15);
  for (const inst of circuit.instances) {
    const placement = placements.get(inst.id);
    const def = catalog.get(inst.component_key);
    if (!placement || !def || placement.side !== "top") continue;
    const fp = getFootprint(def);
    const bw = placement.bodyW ?? fp.width;
    const bh = placement.bodyH ?? fp.height;
    const corners = rectCorners(placement.x, placement.y, bw, bh, placement.rotation);
    silkPen.line(silkThin, [...corners, corners[0]]);
  }

  const outlinePen = newGerber("Profile,NP");
  const edge = outlinePen.circle(0.1);
  outlinePen.line(edge, [
    { x: 0, y: 0 },
    { x: board.width, y: 0 },
    { x: board.width, y: board.height },
    { x: 0, y: board.height },
    { x: 0, y: 0 },
  ]);

  const holes: { x: number; y: number; dia: number }[] = [];
  for (const pad of pads) if (pad.through) holes.push({ x: mmX(pad.x), y: mmY(pad.y), dia: mm(pad.drill) });
  for (const via of vias) holes.push({ x: mmX(via.x), y: mmY(via.y), dia: 0.6 });

  return [
    { name: "circuitsim-F_Cu.gtl", data: copper("top", "Copper,L1,Top") },
    { name: "circuitsim-B_Cu.gbl", data: copper("bottom", "Copper,L2,Bot") },
    { name: "circuitsim-F_Mask.gts", data: mask("top", "Soldermask,Top") },
    { name: "circuitsim-B_Mask.gbs", data: mask("bottom", "Soldermask,Bot") },
    { name: "circuitsim-F_Silkscreen.gto", data: silkPen.render() },
    { name: "circuitsim-Edge_Cuts.gko", data: outlinePen.render() },
    { name: "circuitsim-PTH.drl", data: buildDrill(holes) },
  ];
}

// Excellon drill program, metric with explicit decimals, one tool per distinct size.
function buildDrill(holes: { x: number; y: number; dia: number }[]): string {
  const tools = new Map<string, { dia: number; pts: { x: number; y: number }[] }>();
  for (const h of holes) {
    const dia = Math.max(h.dia, 0.3);
    const key = dia.toFixed(3);
    if (!tools.has(key)) tools.set(key, { dia, pts: [] });
    tools.get(key)!.pts.push(h);
  }
  const order = [...tools.values()];
  const lines = ["M48", "METRIC,TZ", "FMAT,2"];
  order.forEach((tool, i) => lines.push(`T${i + 1}C${tool.dia.toFixed(3)}`));
  lines.push("%");
  order.forEach((tool, i) => {
    lines.push(`T${i + 1}`);
    for (const p of tool.pts) lines.push(`X${p.x.toFixed(3)}Y${p.y.toFixed(3)}`);
  });
  lines.push("M30");
  return lines.join("\n") + "\n";
}
