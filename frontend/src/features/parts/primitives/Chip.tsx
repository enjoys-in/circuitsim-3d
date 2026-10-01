import { paint } from "../paint";
import { Silk } from "./Silk";

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  sublabel?: string;
  legs?: "dip" | "qfp" | "none";
  legCount?: number;
}

function legPositions(start: number, length: number, count: number): number[] {
  const step = length / (count + 1);
  return Array.from({ length: count }, (_, i) => start + step * (i + 1));
}

export function Chip({ x, y, width, height, label, sublabel, legs = "none", legCount = 4 }: Props) {
  const horizontal = legs !== "none" ? legPositions(x, width, legCount) : [];
  const vertical = legs === "qfp" ? legPositions(y, height, legCount) : [];
  return (
    <g>
      {horizontal.map((lx) => (
        <g key={`h${lx}`}>
          <rect x={lx - 1.6} y={y - 3} width={3.2} height={3.5} fill={paint.metal} />
          <rect x={lx - 1.6} y={y + height - 0.5} width={3.2} height={3.5} fill={paint.metal} />
        </g>
      ))}
      {vertical.map((ly) => (
        <g key={`v${ly}`}>
          <rect x={x - 3} y={ly - 1.6} width={3.5} height={3.2} fill={paint.metal} />
          <rect x={x + width - 0.5} y={ly - 1.6} width={3.5} height={3.2} fill={paint.metal} />
        </g>
      ))}
      <rect x={x} y={y} width={width} height={height} rx={1.5} fill={paint.chip} filter={paint.shadow} />
      <circle cx={x + 4} cy={y + 4} r={1.3} className="chip__dot" />
      {label && (
        <Silk x={x + width / 2} y={y + height / 2 + (sublabel ? -1 : 2.5)} size={Math.min(8, width / 6)} tone="dim">
          {label}
        </Silk>
      )}
      {sublabel && (
        <Silk x={x + width / 2} y={y + height / 2 + 8} size={5.5} tone="dim">
          {sublabel}
        </Silk>
      )}
    </g>
  );
}
