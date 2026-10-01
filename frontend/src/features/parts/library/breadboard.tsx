import type { PartArtProps, PartFactory, PartPin, PartSpec } from "../types";
import { BREADBOARD_KEY, getBreadboardLayout } from "./breadboardModel";

const HOLE_FILL: Record<string, string> = {
  pos: "#f3dede",
  neg: "#dbe3f5",
  term: "#e8e3d4",
};

function BreadboardArt(_props: PartArtProps) {
  const L = getBreadboardLayout();
  const railX1 = L.mx - 12;
  const railX2 = L.width - L.mx + 12;
  return (
    <g>
      <rect x={0} y={0} width={L.width} height={L.height} rx={10} fill="#eceadf" stroke="#c7bd9d" strokeWidth={1.5} />
      <rect
        x={L.mx - 10}
        y={L.ravineY}
        width={L.width - (L.mx - 10) * 2}
        height={12}
        rx={2}
        fill="#d8ceb2"
      />
      <line x1={railX1} y1={L.rails.tp} x2={railX2} y2={L.rails.tp} stroke="#d1584f" strokeWidth={1.5} opacity={0.65} />
      <line x1={railX1} y1={L.rails.tn} x2={railX2} y2={L.rails.tn} stroke="#4169b0" strokeWidth={1.5} opacity={0.65} />
      <line x1={railX1} y1={L.rails.bp} x2={railX2} y2={L.rails.bp} stroke="#d1584f" strokeWidth={1.5} opacity={0.65} />
      <line x1={railX1} y1={L.rails.bn} x2={railX2} y2={L.rails.bn} stroke="#4169b0" strokeWidth={1.5} opacity={0.65} />
      <text x={railX1 - 2} y={L.rails.tp + 3} fontSize={9} fill="#d1584f" textAnchor="end">
        +
      </text>
      <text x={railX1 - 2} y={L.rails.tn + 3} fontSize={9} fill="#4169b0" textAnchor="end">
        −
      </text>
      <text x={railX1 - 2} y={L.rails.bp + 3} fontSize={9} fill="#d1584f" textAnchor="end">
        +
      </text>
      <text x={railX1 - 2} y={L.rails.bn + 3} fontSize={9} fill="#4169b0" textAnchor="end">
        −
      </text>
      {L.holes.map((h) => (
        <rect
          key={h.name}
          x={h.x - 3.4}
          y={h.y - 3.4}
          width={6.8}
          height={6.8}
          rx={1.4}
          fill={HOLE_FILL[h.kind]}
          stroke="#9a927a"
          strokeWidth={0.7}
        />
      ))}
    </g>
  );
}

const spec: PartSpec = (() => {
  const L = getBreadboardLayout();
  const pins: PartPin[] = L.holes.map((h) => ({ name: h.name, x: h.x, y: h.y, side: "top" as const }));
  return { width: L.width, height: L.height, pins, Art: BreadboardArt };
})();

const breadboard: PartFactory = () => spec;

export const breadboardParts: Record<string, PartFactory> = {
  [BREADBOARD_KEY]: breadboard,
};
