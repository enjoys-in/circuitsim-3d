import type { PartPin, PinSide } from "./types";

export function pinRow(names: string[], side: PinSide, from: number, step: number, fixed: number): PartPin[] {
  return names.map((name, i) => {
    const along = from + i * step;
    const vertical = side === "left" || side === "right";
    return { name, side, x: vertical ? fixed : along, y: vertical ? along : fixed };
  });
}

export function twoTerminal(width: number, height: number, [a, b]: [string, string]): PartPin[] {
  return [
    { name: a, side: "left", x: 0, y: height / 2 },
    { name: b, side: "right", x: width, y: height / 2 },
  ];
}

export function splitHalves<T>(items: T[]): [T[], T[]] {
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}
