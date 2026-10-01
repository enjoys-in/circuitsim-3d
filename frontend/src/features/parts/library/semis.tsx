import { paint } from "../paint";
import { Lead } from "../primitives/Lead";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory } from "../types";

const W = 60;
const H = 82;
const LEG_X = [18, 30, 42];

interface To92Props {
  label: string;
  legs: string[];
}

export function To92({ label, legs }: To92Props) {
  return (
    <g>
      {LEG_X.map((x) => (
        <Lead key={x} points={`${x},46 ${x},${H}`} />
      ))}
      <g filter={paint.shadow}>
        <path d="M14,8 h32 a5,5 0 0 1 5,5 v33 h-42 v-33 a5,5 0 0 1 5,-5 z" fill={paint.plastic} />
        <path d="M13,14 v28" className="shine" />
      </g>
      <Silk x={30} y={26} size={6.5} tone="dim">
        {label}
      </Silk>
      {legs.map((leg, i) => (
        <Silk key={leg} x={LEG_X[i]} y={40} size={6} tone="dim">
          {leg.slice(0, 1).toUpperCase()}
        </Silk>
      ))}
    </g>
  );
}

export function to92Pins(legs: string[]) {
  return legs.map((name, i) => ({ name, side: "bottom" as const, x: LEG_X[i], y: H }));
}

const LEG_ORDER: Record<string, string[]> = {
  npn_bjt: ["emitter", "base", "collector"],
  pnp_bjt: ["emitter", "base", "collector"],
  nmos: ["source", "gate", "drain"],
  pmos: ["drain", "gate", "source"],
};

function TransistorArt({ def, params }: PartArtProps) {
  return <To92 label={String(params.model ?? def.key)} legs={LEG_ORDER[def.key]} />;
}

const transistor: PartFactory = (def) => ({
  width: W,
  height: H,
  pins: to92Pins(LEG_ORDER[def.key]),
  Art: TransistorArt,
  readout: (_, state) => state?.region ?? (state?.on === undefined ? null : state.on ? "on" : "off"),
});

export const TO92_SIZE = { width: W, height: H };

export const semiconductorParts: Record<string, PartFactory> = {
  npn_bjt: transistor,
  pnp_bjt: transistor,
  nmos: transistor,
  pmos: transistor,
};
