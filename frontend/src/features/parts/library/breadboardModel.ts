// Pure breadboard geometry + electrical-strip topology.
// Shared by the part art (renders holes + handles) and CircuitBuilder (emits strip nets).

export const BREADBOARD_KEY = "breadboard_half";

const COLS = 10;
const PITCH = 18;
const MX = 24;
const TOP_ROWS = ["a", "b", "c", "d", "e"];
const BOTTOM_ROWS = ["f", "g", "h", "i", "j"];

export type HoleKind = "term" | "pos" | "neg";

export interface Hole {
  name: string;
  x: number;
  y: number;
  kind: HoleKind;
}

export interface BreadboardLayout {
  width: number;
  height: number;
  cols: number;
  mx: number;
  holes: Hole[];
  strips: string[][];
  ravineY: number;
  rails: { tp: number; tn: number; bp: number; bn: number };
}

function colX(col: number): number {
  return MX + (col - 1) * PITCH;
}

function compute(): BreadboardLayout {
  const holes: Hole[] = [];
  const strips: string[][] = [];

  let y = 18;
  const tp = y;
  y += PITCH;
  const tn = y;
  y += PITCH + 12;

  const rowY: Record<string, number> = {};
  for (const r of TOP_ROWS) {
    rowY[r] = y;
    y += PITCH;
  }
  const ravineY = y + 1;
  y += 18;
  for (const r of BOTTOM_ROWS) {
    rowY[r] = y;
    y += PITCH;
  }
  y += 12;
  const bp = y;
  y += PITCH;
  const bn = y;
  y += PITCH;

  const height = y + 14;
  const width = MX * 2 + (COLS - 1) * PITCH;

  const tpHoles: string[] = [];
  const tnHoles: string[] = [];
  const bpHoles: string[] = [];
  const bnHoles: string[] = [];
  for (let c = 1; c <= COLS; c++) {
    const x = colX(c);
    holes.push({ name: `TP${c}`, x, y: tp, kind: "pos" });
    tpHoles.push(`TP${c}`);
    holes.push({ name: `TN${c}`, x, y: tn, kind: "neg" });
    tnHoles.push(`TN${c}`);
    holes.push({ name: `BP${c}`, x, y: bp, kind: "pos" });
    bpHoles.push(`BP${c}`);
    holes.push({ name: `BN${c}`, x, y: bn, kind: "neg" });
    bnHoles.push(`BN${c}`);
  }
  strips.push(tpHoles, tnHoles, bpHoles, bnHoles);

  for (let c = 1; c <= COLS; c++) {
    const x = colX(c);
    const top: string[] = [];
    for (const r of TOP_ROWS) {
      const name = `${r}${c}`;
      holes.push({ name, x, y: rowY[r], kind: "term" });
      top.push(name);
    }
    strips.push(top);
    const bottom: string[] = [];
    for (const r of BOTTOM_ROWS) {
      const name = `${r}${c}`;
      holes.push({ name, x, y: rowY[r], kind: "term" });
      bottom.push(name);
    }
    strips.push(bottom);
  }

  return { width, height, cols: COLS, mx: MX, holes, strips, ravineY, rails: { tp, tn, bp, bn } };
}

let cached: BreadboardLayout | null = null;

export function getBreadboardLayout(): BreadboardLayout {
  return (cached ??= compute());
}
