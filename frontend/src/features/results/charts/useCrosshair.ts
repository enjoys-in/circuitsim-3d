import { useCallback, useState, type PointerEvent } from "react";
import { nearestIndex, type Scale } from "./scale";

export function useCrosshair(time: number[], invert: (px: number) => number) {
  const [index, setIndex] = useState<number | null>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      const px = event.clientX - box.left;
      setIndex(nearestIndex(time, invert(px)));
    },
    [time, invert],
  );

  const onPointerLeave = useCallback(() => setIndex(null), []);
  return { index, onPointerMove, onPointerLeave };
}

export function invertScale(domain: [number, number], width: number): (px: number) => number {
  const [d0, d1] = domain;
  return (px) => d0 + (px / Math.max(width, 1)) * (d1 - d0);
}

export type { Scale };
