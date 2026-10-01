import { toNumber } from "../../../shared/lib/format";
import { paint } from "../paint";
import { Lead } from "../primitives/Lead";
import { Pcb } from "../primitives/Pcb";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory } from "../types";

function ButtonArt({ params }: PartArtProps) {
  const pressed = toNumber(params.pressed) === 1;
  return (
    <g className="part-clickable">
      <Lead points="0,28 17,28" />
      <Lead points="53,28 70,28" />
      <g filter={paint.shadow}>
        <rect x={15} y={10} width={40} height={36} rx={3} fill={paint.metal} />
        <rect x={19} y={14} width={32} height={28} rx={2} fill="#1f2937" />
        <circle cx={35} cy={28} r={pressed ? 9 : 11} fill={pressed ? "#7f1d1d" : "#dc2626"} />
        <circle cx={32} cy={25} r={pressed ? 3 : 4} fill="#ffffff" opacity={0.25} />
      </g>
    </g>
  );
}

function PotArt({ params }: PartArtProps) {
  const position = Math.min(Math.max(toNumber(params.position, 0.5), 0), 1);
  const angle = -135 + 270 * position;
  return (
    <g className="part-clickable">
      {[20, 36, 52].map((x) => (
        <Lead key={x} points={`${x},58 ${x},86`} />
      ))}
      <g filter={paint.shadow}>
        <rect x={8} y={8} width={56} height={52} rx={6} fill="#1d4ed8" />
        <circle cx={36} cy={32} r={19} fill={paint.metal} />
        <circle cx={36} cy={32} r={13} fill="#e2e8f0" />
      </g>
      <line
        x1={36}
        y1={32}
        x2={36}
        y2={17}
        stroke="#1f2937"
        strokeWidth={3}
        strokeLinecap="round"
        transform={`rotate(${angle} 36 32)`}
      />
    </g>
  );
}

function FanArt({ state }: PartArtProps) {
  const level = state?.on ? Math.max(0.2, state.level ?? 1) : 0;
  const blades = Array.from({ length: 7 }, (_, i) => i * (360 / 7));
  return (
    <g>
      <Lead points="0,34 10,34" />
      <Lead points="0,62 10,62" />
      <g filter={paint.shadow}>
        <rect x={8} y={4} width={88} height={88} rx={10} fill="#18181b" />
        <circle cx={52} cy={48} r={40} fill="#0a0a0a" />
      </g>
      <g
        className={level ? "fan-rotor fan-rotor--on" : "fan-rotor"}
        style={{ animationDuration: level ? `${0.9 / level}s` : undefined, transformOrigin: "52px 48px" }}
      >
        {blades.map((deg) => (
          <path key={deg} d="M52,48 q10,-30 28,-26 q-6,16 -28,26 z" fill="#3f3f46" transform={`rotate(${deg} 52 48)`} />
        ))}
        <circle cx={52} cy={48} r={11} fill="#27272a" />
      </g>
      <Silk x={52} y={51} size={6} tone="dim">
        12V
      </Silk>
    </g>
  );
}

function BuzzerArt({ state }: PartArtProps) {
  return (
    <g>
      <Lead points="22,50 22,68" />
      <Lead points="42,50 42,68" />
      <g filter={paint.shadow}>
        <circle cx={32} cy={30} r={24} fill={paint.plastic} />
        <circle cx={32} cy={30} r={5} fill="#0a0a0a" />
      </g>
      <Silk x={16} y={16} size={9}>
        +
      </Silk>
      {state?.on && (
        <g className="buzz" fill="none" stroke="#fbbf24" strokeWidth={1.6}>
          <path d="M58,18 q6,12 0,24" />
          <path d="M63,13 q9,17 0,34" />
        </g>
      )}
    </g>
  );
}

function RelayArt({ state }: PartArtProps) {
  const on = Boolean(state?.on);
  return (
    <g>
      <Lead points="0,24 14,24" />
      <Lead points="0,56 14,56" />
      <Lead points="82,20 96,20" />
      <Lead points="82,44 96,44" />
      <Lead points="82,68 96,68" />
      <g filter={paint.shadow}>
        <Pcb width={82} height={80} color="blue" radius={6} />
        <rect x={14} y={14} width={46} height={52} rx={3} fill="#1e3a8a" />
        <rect x={20} y={20} width={34} height={40} rx={2} fill="#0a0a0a" />
      </g>
      <circle cx={68} cy={16} r={4} fill={on ? "#22c55e" : "#14532d"} />
      <Silk x={37} y={73} size={8}>
        RELAY
      </Silk>
    </g>
  );
}

function ServoArt({ params, state }: PartArtProps) {
  const angle = state?.angle ?? toNumber(params.angle, 90);
  const rot = -90 + Math.min(Math.max(angle, 0), 180);
  return (
    <g>
      <Lead points="0,20 16,20" />
      <Lead points="0,38 16,38" />
      <Lead points="0,56 16,56" />
      <g filter={paint.shadow}>
        <rect x={16} y={8} width={44} height={54} rx={3} fill="#1d4ed8" />
        <rect x={58} y={22} width={12} height={26} rx={2} fill="#1d4ed8" />
        <circle cx={70} cy={35} r={4} fill={paint.metal} />
      </g>
      <g transform={`rotate(${rot} 70 35)`}>
        <rect x={68} y={11} width={4} height={26} rx={2} fill="#e2e8f0" />
        <circle cx={70} cy={11} r={3} fill="#e2e8f0" />
      </g>
      <Silk x={38} y={54} size={8} tone="dim">
        SG90
      </Silk>
    </g>
  );
}

function displayLines(state: PartArtProps["state"]): string[] {
  if (state?.lines?.length) return state.lines;
  if (state?.text) return state.text.split("\n");
  return [];
}

function OledArt({ state }: PartArtProps) {
  const lines = displayLines(state).slice(0, 4);
  return (
    <g>
      {["vcc", "gnd", "scl", "sda"].map((_, i) => (
        <Lead key={i} points={`0,${18 + i * 14} 14,${18 + i * 14}`} />
      ))}
      <g filter={paint.shadow}>
        <Pcb width={100} height={74} color="blue" radius={6} />
        <rect x={22} y={12} width={70} height={50} rx={2} fill="#020617" stroke="#1e293b" />
      </g>
      {lines.map((line, i) => (
        <text
          key={i}
          x={26}
          y={24 + i * 12}
          fill="#38bdf8"
          fontSize={8}
          fontFamily="ui-monospace, monospace"
        >
          {line.slice(0, 16)}
        </text>
      ))}
      <Silk x={57} y={70} size={7} tone="dim">
        OLED
      </Silk>
    </g>
  );
}

function LcdArt({ state }: PartArtProps) {
  const lines = displayLines(state).slice(0, 2);
  return (
    <g>
      {["vcc", "gnd", "scl", "sda"].map((_, i) => (
        <Lead key={i} points={`${18 + i * 12},60 ${18 + i * 12},74`} />
      ))}
      <g filter={paint.shadow}>
        <Pcb width={120} height={60} color="green" radius={5} />
        <rect x={12} y={8} width={96} height={40} rx={2} fill="#134e4a" stroke="#0f766e" />
      </g>
      {lines.map((line, i) => (
        <text
          key={i}
          x={16}
          y={24 + i * 18}
          fill="#5eead4"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          {line.slice(0, 16)}
        </text>
      ))}
    </g>
  );
}

function BlankPcbArt() {
  const holes = Array.from({ length: 84 }, (_, i) => [24 + (i % 14) * 14, 26 + Math.floor(i / 14) * 18]);
  return (
    <g>
      <Pcb width={240} height={150} color="green" radius={8} />
      {holes.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2.2} fill={paint.gold} opacity={0.8} />
      ))}
    </g>
  );
}

export const actuatorParts: Record<string, PartFactory> = {
  push_button: () => ({
    width: 70,
    height: 56,
    pins: [
      { name: "a", side: "left", x: 0, y: 28 },
      { name: "b", side: "right", x: 70, y: 28 },
    ],
    Art: ButtonArt,
    interact: (params) => ({ ...params, pressed: toNumber(params.pressed) === 1 ? 0 : 1 }),
  }),
  potentiometer: () => ({
    width: 72,
    height: 86,
    pins: ["1", "wiper", "3"].map((name, i) => ({ name, side: "bottom" as const, x: 20 + i * 16, y: 86 })),
    Art: PotArt,
    interact: (params) => ({ ...params, position: (Math.round(toNumber(params.position, 0.5) * 4 + 1) % 5) / 4 }),
    readout: (params) => `${Math.round(toNumber(params.position, 0.5) * 100)}%`,
  }),
  dc_fan: () => ({
    width: 96,
    height: 96,
    pins: [
      { name: "+", side: "left", x: 0, y: 34 },
      { name: "-", side: "left", x: 0, y: 62 },
    ],
    Art: FanArt,
  }),
  buzzer: () => ({
    width: 70,
    height: 68,
    pins: [
      { name: "+", side: "bottom", x: 22, y: 68 },
      { name: "-", side: "bottom", x: 42, y: 68 },
    ],
    Art: BuzzerArt,
  }),
  relay: () => ({
    width: 96,
    height: 82,
    pins: [
      { name: "coil+", side: "left", x: 0, y: 24 },
      { name: "coil-", side: "left", x: 0, y: 56 },
      { name: "com", side: "right", x: 96, y: 20 },
      { name: "no", side: "right", x: 96, y: 44 },
      { name: "nc", side: "right", x: 96, y: 68 },
    ],
    Art: RelayArt,
    readout: (_params, state) => (state?.on ? "ON" : "off"),
  }),
  servo_sg90: () => ({
    width: 92,
    height: 70,
    pins: [
      { name: "vcc", side: "left", x: 0, y: 20 },
      { name: "gnd", side: "left", x: 0, y: 38 },
      { name: "signal", side: "left", x: 0, y: 56 },
    ],
    Art: ServoArt,
    readout: (params, state) =>
      `${Math.round(state?.angle ?? toNumber(params.angle, 90))}\u00b0`,
  }),
  oled_ssd1306: () => ({
    width: 100,
    height: 74,
    pins: ["vcc", "gnd", "scl", "sda"].map((name, i) => ({
      name,
      side: "left" as const,
      x: 0,
      y: 18 + i * 14,
    })),
    Art: OledArt,
  }),
  lcd1602_i2c: () => ({
    width: 120,
    height: 74,
    pins: ["vcc", "gnd", "scl", "sda"].map((name, i) => ({
      name,
      side: "bottom" as const,
      x: 18 + i * 12,
      y: 74,
    })),
    Art: LcdArt,
  }),
  blank_pcb: () => ({ width: 240, height: 150, pins: [], Art: BlankPcbArt }),
};
