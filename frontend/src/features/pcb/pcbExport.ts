import type { Board } from "./model/pcbTypes";

// Overlays that are editing aids, not part of the board artwork.
const HIDE = ".ratsnest, .route-preview, .drc-markers, .fp-handles, .trace-handles";

// Visual properties that live in CSS and must be inlined before the SVG is
// rasterised in isolation (an <img> does not see the page stylesheet).
const STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "color",
  "font-size",
  "font-family",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
];

function inlineStyles(live: Element, clone: Element): void {
  const liveNodes = [live, ...Array.from(live.querySelectorAll("*"))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll("*"))];
  for (let i = 0; i < liveNodes.length; i++) {
    const computed = getComputedStyle(liveNodes[i]);
    const style = (cloneNodes[i] as SVGElement).style;
    for (const prop of STYLE_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) style.setProperty(prop, value);
    }
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function renderPng(board: Board, scale = 3): Promise<Blob | null> {
  const live = document.querySelector(".pcb-canvas") as SVGSVGElement | null;
  if (!live) return null;

  const clone = live.cloneNode(true) as SVGSVGElement;
  inlineStyles(live, clone); // trees still match 1:1 here
  clone.querySelectorAll(HIDE).forEach((node) => node.remove());

  const pad = 16;
  const width = board.width + pad * 2;
  const height = board.height + pad * 2;
  clone.setAttribute("viewBox", `${-pad} ${-pad} ${width} ${height}`);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const svgText = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#081c1f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportPcbPng(board: Board): Promise<boolean> {
  const blob = await renderPng(board);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pcb-layout.png";
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function copyPcbPng(board: Board): Promise<boolean> {
  const blob = await renderPng(board);
  if (!blob || !navigator.clipboard || typeof ClipboardItem === "undefined") return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}
