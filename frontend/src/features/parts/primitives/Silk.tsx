import type { ReactNode } from "react";

interface Props {
  x: number;
  y: number;
  size?: number;
  anchor?: "start" | "middle" | "end";
  tone?: "silk" | "ink" | "dim" | "lcd";
  rotate?: number;
  children: ReactNode;
}

export function Silk({ x, y, size = 7, anchor = "middle", tone = "silk", rotate, children }: Props) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      className={`silk silk--${tone}`}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  );
}
