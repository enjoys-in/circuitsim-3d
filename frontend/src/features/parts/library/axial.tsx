import type { ComponentType } from "react";
import type { Params } from "../../../domain";
import { formatSI } from "../../../shared/lib/format";
import { parseSI, resistorBands } from "../colorCode";
import { twoTerminal } from "../layout";
import { paint } from "../paint";
import { Lead } from "../primitives/Lead";
import type { PartArtProps, PartFactory } from "../types";

const W = 112;
const H = 30;
const MID = H / 2;

function Leads() {
  return (
    <>
      <Lead points={`0,${MID} 26,${MID}`} />
      <Lead points={`86,${MID} ${W},${MID}`} />
    </>
  );
}

function ResistorArt({ params }: PartArtProps) {
  const bands = resistorBands(parseSI(params.resistance, 1000));
  return (
    <g>
      <Leads />
      <g filter={paint.shadow}>
        <path d={`M28,${MID - 9} q-6,0 -6,9 q0,9 6,9 h52 q6,0 6,-9 q0,-9 -6,-9 z`} fill={paint.resistor} />
        {bands.map((color, i) => (
          <rect
            key={i}
            x={36 + i * 10 + (i === 3 ? 8 : 0)}
            y={MID - 8.5}
            width={5}
            height={17}
            fill={color}
            opacity={0.92}
          />
        ))}
        <path d={`M30,${MID - 7} h48`} className="shine" />
      </g>
    </g>
  );
}

function DiodeArt({ def }: PartArtProps) {
  const zener = def.key === "zener_diode";
  return (
    <g>
      <Leads />
      <g filter={paint.shadow}>
        <rect x={30} y={MID - 7} width={52} height={14} rx={6} fill={zener ? paint.glass : paint.plastic} />
        <rect x={70} y={MID - 7} width={6} height={14} fill={zener ? "#111" : "#d4d4d8"} />
        <path d={`M34,${MID - 4.5} h44`} className="shine" />
      </g>
    </g>
  );
}

function InductorArt() {
  const turns = Array.from({ length: 7 }, (_, i) => 34 + i * 7);
  return (
    <g>
      <Leads />
      <g filter={paint.shadow}>
        <rect x={30} y={MID - 8} width={52} height={16} rx={4} fill="#27272a" />
        {turns.map((x) => (
          <ellipse key={x} cx={x + 3} cy={MID} rx={3.4} ry={9} fill="none" stroke={paint.copper} strokeWidth={2.6} />
        ))}
      </g>
    </g>
  );
}

function axial(Art: ComponentType<PartArtProps>, readout?: (params: Params) => string): PartFactory {
  return (def) => ({
    width: W,
    height: H,
    pins: twoTerminal(W, H, [def.pins[0]?.name ?? "a", def.pins[1]?.name ?? "b"]),
    Art,
    readout: readout ? (params) => readout(params) : undefined,
  });
}

export const axialParts: Record<string, PartFactory> = {
  resistor: axial(ResistorArt, (p) => formatSI(parseSI(p.resistance, 1000), "Ω")),
  diode: axial(DiodeArt),
  zener_diode: axial(DiodeArt, (p) => `${parseSI(p.vz, 5.1)} V`),
  inductor: axial(InductorArt, (p) => formatSI(parseSI(p.inductance, 1e-5), "H")),
};
