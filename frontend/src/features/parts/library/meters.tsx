import type { InstanceState } from "../../../domain";
import { formatSI } from "../../../shared/lib/format";
import { paint } from "../paint";
import { Lead } from "../primitives/Lead";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory } from "../types";

const W = 88;
const H = 66;
const CX = W / 2;
const CY = 32;

function meterArt(symbol: string, unit: string, read: (s?: InstanceState) => number | undefined) {
  return function MeterArt({ state }: PartArtProps) {
    const value = read(state);
    const text = value === undefined || value === null ? `— ${unit}` : formatSI(value, unit);
    return (
      <g>
        <Lead points={`0,${CY} 16,${CY}`} />
        <Lead points={`${W - 16},${CY} ${W},${CY}`} />
        <g filter={paint.shadow}>
          <circle cx={CX} cy={CY} r={26} fill={paint.metal} stroke="#334155" strokeWidth={1.2} />
          <circle cx={CX} cy={CY} r={21} fill="#06121b" />
        </g>
        <Silk x={CX} y={CY - 5} size={12} tone="ink">
          {symbol}
        </Silk>
        <Silk x={CX} y={CY + 12} size={8.5} tone="lcd">
          {text}
        </Silk>
      </g>
    );
  };
}

export const meterParts: Record<string, PartFactory> = {
  voltmeter: () => ({
    width: W,
    height: H,
    pins: [
      { name: "+", side: "left", x: 0, y: CY },
      { name: "-", side: "right", x: W, y: CY },
    ],
    Art: meterArt("V", "V", (s) => s?.voltage),
  }),
  ammeter: () => ({
    width: W,
    height: H,
    pins: [
      { name: "in", side: "left", x: 0, y: CY },
      { name: "out", side: "right", x: W, y: CY },
    ],
    Art: meterArt("A", "A", (s) => s?.current),
  }),
};
