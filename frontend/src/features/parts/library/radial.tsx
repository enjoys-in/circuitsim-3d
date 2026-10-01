import type { ComponentType } from "react";
import type { InstanceState, Params } from "../../../domain";
import { formatSI } from "../../../shared/lib/format";
import { capacitorCode, parseSI } from "../colorCode";
import { LED_COLORS, ledColor, paint } from "../paint";
import { Lead } from "../primitives/Lead";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory, PartSpec } from "../types";

const W = 60;
const H = 78;
const LEFT = 22;
const RIGHT = 38;

function Legs({ top, longLeft = false }: { top: number; longLeft?: boolean }) {
  return (
    <>
      <Lead points={`${LEFT},${top} ${LEFT},${H}`} />
      <Lead points={`${RIGHT},${top} ${RIGHT},${longLeft ? H - 6 : H}`} />
    </>
  );
}

function LedArt({ params, state }: PartArtProps) {
  const color = ledColor(params);
  const lit = Boolean(state?.on) && !state?.burnt;
  const level = lit ? Math.max(0.35, state?.level ?? 1) : 0;
  return (
    <g>
      <Legs top={46} longLeft />
      {lit && (
        <circle
          className="led-glow"
          cx={30}
          cy={24}
          r={26}
          fill={LED_COLORS[color]}
          opacity={0.55 * level}
          filter={paint.glow}
        />
      )}
      <g filter={paint.shadow}>
        <path d="M14,46 v-24 a16,16 0 0 1 32,0 v24 z" fill={state?.burnt ? "#3f3f46" : paint.led(color)} />
        <path d="M12,46 h36 v4 h-36 z" fill={state?.burnt ? "#27272a" : LED_COLORS[color]} opacity={0.8} />
        <path d="M44,30 v16" stroke="#00000055" strokeWidth={2} />
        <path d="M19,20 a11,11 0 0 1 8,-9" className="shine shine--thick" />
      </g>
      {lit && (
        <circle
          className="led-glow"
          cx={30}
          cy={24}
          r={9}
          fill="#ffffff"
          opacity={0.35 + 0.45 * level}
          filter={paint.glow}
        />
      )}
      {state?.burnt && <path d="M24,14 l6,8 l-4,4 l8,8" stroke="#111" strokeWidth={1.4} fill="none" />}
    </g>
  );
}

function CeramicArt({ params }: PartArtProps) {
  return (
    <g>
      <Legs top={36} />
      <g filter={paint.shadow}>
        <ellipse cx={30} cy={24} rx={20} ry={17} fill={paint.ceramic} />
        <ellipse cx={24} cy={17} rx={7} ry={4} fill="#ffffff" opacity={0.25} />
      </g>
      <Silk x={30} y={28} size={9} tone="ink">
        {capacitorCode(parseSI(params.capacitance, 1e-7))}
      </Silk>
    </g>
  );
}

function ElectrolyticArt({ params }: PartArtProps) {
  return (
    <g>
      <Legs top={58} longLeft />
      <g filter={paint.shadow}>
        <rect x={10} y={6} width={40} height={52} rx={5} fill={paint.electrolytic} />
        <rect x={38} y={6} width={9} height={52} fill="#bfdbfe" opacity={0.75} />
        <ellipse cx={30} cy={8} rx={20} ry={4} fill={paint.metal} />
        <path d="M24,8 h12 M30,4 v8" stroke="#64748b" strokeWidth={0.8} />
        {[20, 32, 44].map((y) => (
          <rect key={y} x={40.5} y={y} width={4} height={1.8} fill="#1e3a8a" />
        ))}
        <path d="M15,14 v38" className="shine shine--thick" />
      </g>
      <Silk x={24} y={36} size={8} rotate={-90} tone="silk">
        {formatSI(parseSI(params.capacitance, 1e-5), "F")}
      </Silk>
    </g>
  );
}

function LdrArt() {
  return (
    <g>
      <Legs top={36} />
      <g filter={paint.shadow}>
        <circle cx={30} cy={22} r={18} fill="#e7e5e4" />
        <circle cx={30} cy={22} r={15} fill="#fef3c7" />
        <path
          d="M19,14 h22 v4 h-22 v4 h22 v4 h-22 v4 h22"
          fill="none"
          stroke="#c2410c"
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

function radial(
  Art: ComponentType<PartArtProps>,
  readout?: (params: Params, state?: InstanceState) => string | null,
): PartFactory {
  return (def): PartSpec => ({
    width: W,
    height: H,
    pins: [
      { name: def.pins[0]?.name ?? "a", side: "bottom", x: LEFT, y: H },
      { name: def.pins[1]?.name ?? "b", side: "bottom", x: RIGHT, y: H },
    ],
    Art,
    readout,
  });
}

export const radialParts: Record<string, PartFactory> = {
  led: radial(LedArt, (_, state) => (state?.current !== undefined ? formatSI(state.current, "A") : null)),
  capacitor: radial(CeramicArt, (p) => formatSI(parseSI(p.capacitance, 1e-7), "F")),
  electrolytic_cap: radial(ElectrolyticArt),
  ldr: radial(LdrArt, (p) => `${parseSI(p.lux, 100)} lx`),
};
