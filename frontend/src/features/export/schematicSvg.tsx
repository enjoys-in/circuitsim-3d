import { renderToStaticMarkup } from "react-dom/server";
import type { PartNodeType, WireEdgeType } from "../board/nodes/types";
import { PartArt } from "../parts/PartArt";
import { PartDefs } from "../parts/PartDefs";
import { getPart } from "../parts/registry";

const PADDING = 40;
const LABEL_SPACE = 16;
const BG = "#0d2a2d";

interface Pt {
  x: number;
  y: number;
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] as string,
  );
}

function pinPoint(node: PartNodeType, handle: string | null | undefined): Pt | null {
  if (!handle) return null;
  const pin = getPart(node.data.def).pins.find((p) => p.name === handle);
  if (!pin) return null;
  return { x: node.position.x + pin.x, y: node.position.y + pin.y };
}

function wirePath(a: Pt, b: Pt): string {
  const dx = Math.max(30, Math.abs(b.x - a.x) * 0.4);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

function nodeMarkup(node: PartNodeType): string {
  const { def, params, label } = node.data;
  let inner: string;
  try {
    inner = renderToStaticMarkup(<PartArt def={def} params={params} />);
  } catch {
    const spec = getPart(def);
    inner = `<rect width="${spec.width}" height="${spec.height}" rx="6" fill="#1e293b" stroke="#475569"/>`;
  }
  const text = `<text x="0" y="-5" font-size="11" fill="#cbd5e1" font-family="monospace">${escapeXml(label)}</text>`;
  return `<g transform="translate(${node.position.x} ${node.position.y})">${inner}${text}</g>`;
}

export function buildSchematicSvg(nodes: PartNodeType[], edges: WireEdgeType[]): string {
  if (nodes.length === 0) {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120">`,
      `<rect width="320" height="120" fill="${BG}"/>`,
      `<text x="160" y="64" fill="#64748b" font-size="13" text-anchor="middle" font-family="sans-serif">Empty circuit</text>`,
      `</svg>`,
    ].join("");
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const spec = getPart(node.data.def);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y - LABEL_SPACE);
    maxX = Math.max(maxX, node.position.x + spec.width);
    maxY = Math.max(maxY, node.position.y + spec.height);
  }
  minX = Math.round(minX - PADDING);
  minY = Math.round(minY - PADDING);
  const w = Math.round(maxX + PADDING - minX);
  const h = Math.round(maxY + PADDING - minY);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const wires: string[] = [];
  for (const edge of edges) {
    const src = byId.get(edge.source);
    const tgt = byId.get(edge.target);
    if (!src || !tgt) continue;
    const a = pinPoint(src, edge.sourceHandle);
    const b = pinPoint(tgt, edge.targetHandle);
    if (!a || !b) continue;
    const color = edge.data?.color ?? "#38bdf8";
    wires.push(
      `<path d="${wirePath(a, b)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`,
    );
  }

  const defs = renderToStaticMarkup(<PartDefs />);
  const parts = nodes.map(nodeMarkup).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`,
    `<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="${BG}"/>`,
    defs,
    `<g class="wires">${wires.join("")}</g>`,
    `<g class="parts">${parts}</g>`,
    `</svg>`,
  ].join("\n");
}
