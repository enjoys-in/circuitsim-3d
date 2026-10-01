import { paint } from "../paint";
import { Silk } from "./Silk";

interface Props {
  x: number;
  y: number;
  label?: string;
  labelAt?: "left" | "right" | "above" | "below";
}

const OFFSET = { left: [-7, 2.5], right: [7, 2.5], above: [0, -7], below: [0, 11] } as const;
const ANCHOR = { left: "end", right: "start", above: "middle", below: "middle" } as const;

export function HeaderPin({ x, y, label, labelAt = "right" }: Props) {
  const [dx, dy] = OFFSET[labelAt];
  return (
    <g>
      <rect x={x - 3.5} y={y - 3.5} width={7} height={7} rx={1} className="header__base" />
      <rect x={x - 2} y={y - 2} width={4} height={4} rx={0.6} fill={paint.gold} />
      {label && (
        <Silk x={x + dx} y={y + dy} size={6} anchor={ANCHOR[labelAt]}>
          {label.toUpperCase()}
        </Silk>
      )}
    </g>
  );
}
