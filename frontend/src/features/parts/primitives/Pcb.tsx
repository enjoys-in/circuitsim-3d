import { paint, type PcbColor } from "../paint";

interface Props {
  x?: number;
  y?: number;
  width: number;
  height: number;
  color: PcbColor;
  radius?: number;
  holes?: boolean;
}

export function Pcb({ x = 0, y = 0, width, height, color, radius = 5, holes = true }: Props) {
  const r = 3.2;
  const inset = 6;
  const corners = [
    [x + inset, y + inset],
    [x + width - inset, y + inset],
    [x + inset, y + height - inset],
    [x + width - inset, y + height - inset],
  ];
  return (
    <g filter={paint.shadow}>
      <rect x={x} y={y} width={width} height={height} rx={radius} fill={paint.pcb(color)} className="pcb" />
      <rect x={x + 1.5} y={y + 1.5} width={width - 3} height={height - 3} rx={radius - 1} className="pcb__edge" />
      {holes &&
        corners.map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={r} fill={paint.gold} />
            <circle cx={cx} cy={cy} r={r - 1.4} className="pcb__hole" />
          </g>
        ))}
    </g>
  );
}
