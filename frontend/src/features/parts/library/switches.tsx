import { toNumber } from "../../../shared/lib/format";
import { paint } from "../paint";
import { Lead } from "../primitives/Lead";
import { Pcb } from "../primitives/Pcb";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory } from "../types";

const ON = paint.metal;
const OFF = "#334155";

function throwArt(labels: [string, string]) {
  return function ThrowArt({ params }: PartArtProps) {
    const hi = toNumber(params.position) === 1;
    return (
      <g className="part-clickable">
        <Pcb width={96} height={64} color="blue" />
        <Lead points="0,32 22,32" />
        <Lead points="74,18 96,18" />
        <Lead points="74,46 96,46" />
        <circle cx={26} cy={32} r={3.4} fill={ON} />
        <line
          x1={26}
          y1={32}
          x2={70}
          y2={hi ? 18 : 46}
          stroke={ON}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={70} cy={18} r={3.4} fill={hi ? ON : OFF} />
        <circle cx={70} cy={46} r={3.4} fill={hi ? OFF : ON} />
        <Silk x={85} y={15} size={7}>
          {labels[0]}
        </Silk>
        <Silk x={85} y={55} size={7}>
          {labels[1]}
        </Silk>
      </g>
    );
  };
}

function DipArt({ params }: PartArtProps) {
  const mask = toNumber(params.switches, 0);
  return (
    <g className="part-clickable">
      <Pcb width={120} height={70} color="black" />
      {[0, 1, 2, 3].map((i) => {
        const on = (mask & (1 << i)) !== 0;
        const x = 18 + i * 26;
        return (
          <g key={i}>
            <Lead points={`${x},0 ${x},12`} />
            <Lead points={`${x},58 ${x},70`} />
            <rect x={x - 9} y={16} width={18} height={38} rx={3} fill="#e5e7eb" />
            <rect x={x - 6} y={on ? 19 : 36} width={12} height={15} rx={2} fill={on ? "#ef4444" : "#475569"} />
            <Silk x={x} y={13} size={6}>
              {i + 1}
            </Silk>
          </g>
        );
      })}
    </g>
  );
}

export const switchParts: Record<string, PartFactory> = {
  spdt_switch: () => ({
    width: 96,
    height: 64,
    pins: [
      { name: "com", side: "left", x: 0, y: 32 },
      { name: "no", side: "right", x: 96, y: 18 },
      { name: "nc", side: "right", x: 96, y: 46 },
    ],
    Art: throwArt(["NO", "NC"]),
    interact: (params) => ({ ...params, position: toNumber(params.position) === 1 ? 0 : 1 }),
    readout: (params) => (toNumber(params.position) === 1 ? "→NO" : "→NC"),
  }),
  slide_switch: () => ({
    width: 96,
    height: 64,
    pins: [
      { name: "com", side: "left", x: 0, y: 32 },
      { name: "2", side: "right", x: 96, y: 18 },
      { name: "1", side: "right", x: 96, y: 46 },
    ],
    Art: throwArt(["2", "1"]),
    interact: (params) => ({ ...params, position: toNumber(params.position) === 1 ? 0 : 1 }),
    readout: (params) => (toNumber(params.position) === 1 ? "→2" : "→1"),
  }),
  dip_switch_4: () => ({
    width: 120,
    height: 70,
    pins: [0, 1, 2, 3].flatMap((i) => [
      { name: `${i + 1}a`, side: "top" as const, x: 18 + i * 26, y: 0 },
      { name: `${i + 1}b`, side: "bottom" as const, x: 18 + i * 26, y: 70 },
    ]),
    Art: DipArt,
    // Click cycles through the 16 on/off combinations.
    interact: (params) => ({ ...params, switches: (toNumber(params.switches, 0) + 1) % 16 }),
    readout: (params) => toNumber(params.switches, 0).toString(2).padStart(4, "0"),
  }),
};
