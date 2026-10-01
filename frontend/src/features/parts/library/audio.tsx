import { paint } from "../paint";
import { Lead } from "../primitives/Lead";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory } from "../types";

const W = 88;
const H = 88;

function SpeakerArt({ state }: PartArtProps) {
  const on = Boolean(state?.on);
  return (
    <g>
      <Lead points={`26,${H} 26,74`} />
      <Lead points={`62,${H} 62,74`} />
      <g filter={paint.shadow}>
        <circle cx={44} cy={40} r={38} fill="#18181b" />
        <circle cx={44} cy={40} r={30} fill="#27272a" />
        <circle cx={44} cy={40} r={14} fill={paint.metal} />
        <circle cx={44} cy={40} r={6} fill="#0a0a0a" />
      </g>
      <Silk x={20} y={16} size={9}>
        +
      </Silk>
      {on && (
        <g className="buzz" fill="none" stroke="#a5b4fc" strokeWidth={2}>
          <path d="M84,26 q10,14 0,28" />
          <path d="M90,20 q15,20 0,40" />
        </g>
      )}
    </g>
  );
}

export const audioParts: Record<string, PartFactory> = {
  speaker: () => ({
    width: W,
    height: H,
    pins: [
      { name: "+", side: "bottom", x: 26, y: H },
      { name: "-", side: "bottom", x: 62, y: H },
    ],
    Art: SpeakerArt,
  }),
};
