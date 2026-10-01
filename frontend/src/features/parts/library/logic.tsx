import type { ComponentDef } from "../../../domain";
import { toNumber } from "../../../shared/lib/format";
import { pinRow } from "../layout";
import { LED_COLORS, paint } from "../paint";
import { Chip } from "../primitives/Chip";
import { Lead } from "../primitives/Lead";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory } from "../types";

const DIP_W = 124;
const ROW = 20;
const TOP = 22;

const SYMBOL: Record<string, string> = {
  and: "AND",
  or: "OR",
  nand: "NAND",
  nor: "NOR",
  xor: "XOR",
  xnor: "XNOR",
  not: "NOT",
  mux2: "MUX",
  dff: "D-FF",
  tff: "T-FF",
  jkff: "JK-FF",
  buffer: "BUF",
  tristate: "TRI",
  half_adder: "HALF+",
  full_adder: "FULL+",
  comparator: "CMP",
  mux4: "MUX4",
  demux4: "DMUX",
  decoder2to4: "DEC",
  encoder4to2: "ENC",
  srff: "SR-FF",
  counter4: "CTR4",
  shift8: "SHIFT8",
  register4: "REG4",
  alu4: "ALU",
  rom16: "ROM",
  ram16: "RAM",
};

function sides(def: ComponentDef) {
  const inputs = def.pins.filter((p) => p.direction !== "output").map((p) => p.name);
  const outputs = def.pins.filter((p) => p.direction === "output").map((p) => p.name);
  const rows = Math.max(inputs.length, outputs.length, 2);
  return { inputs, outputs, height: TOP + rows * ROW };
}

function DipArt({ def, params, state }: PartArtProps) {
  const { inputs, outputs, height } = sides(def);
  const rowY = (i: number) => TOP + i * ROW;
  return (
    <g>
      {inputs.map((name, i) => (
        <Lead key={name} points={`0,${rowY(i)} 28,${rowY(i)}`} />
      ))}
      {outputs.map((name, i) => (
        <Lead key={name} points={`${DIP_W - 28},${rowY(i)} ${DIP_W},${rowY(i)}`} />
      ))}
      <Chip x={26} y={6} width={DIP_W - 52} height={height - 12} label={String(params.chip ?? "")} sublabel={SYMBOL[def.key]} />
      {inputs.map((name, i) => (
        <Silk key={name} x={31} y={rowY(i) + 2.5} size={6} anchor="start" tone="dim">
          {name}
        </Silk>
      ))}
      {outputs.map((name, i) => (
        <Silk key={name} x={DIP_W - 31} y={rowY(i) + 2.5} size={6} anchor="end" tone="dim">
          {name}
        </Silk>
      ))}
      {state?.on !== undefined && (
        <circle cx={DIP_W - 34} cy={height - 14} r={2.6} fill={state.on ? LED_COLORS.green : "#1f2937"} />
      )}
    </g>
  );
}

const dip: PartFactory = (def) => {
  const { inputs, outputs, height } = sides(def);
  return {
    width: DIP_W,
    height,
    pins: [...pinRow(inputs, "left", TOP, ROW, 0), ...pinRow(outputs, "right", TOP, ROW, DIP_W)],
    Art: DipArt,
  };
};

function ClockArt({ params, state }: PartArtProps) {
  return (
    <g>
      <Lead points="64,26 80,26" />
      <g filter={paint.shadow}>
        <rect x={4} y={6} width={62} height={40} rx={9} fill={paint.metal} />
        <rect x={9} y={11} width={52} height={30} rx={6} fill="none" stroke="#64748b" strokeWidth={0.8} />
      </g>
      <Silk x={34} y={24} size={8} tone="ink">
        CLK
      </Silk>
      <Silk x={34} y={35} size={6} tone="ink">
        {`T=${toNumber(params.period, 2)} ticks`}
      </Silk>
      <circle cx={57} cy={16} r={2.8} fill={state?.on ? LED_COLORS.green : "#334155"} />
    </g>
  );
}

function SwitchArt({ params }: PartArtProps) {
  const on = toNumber(params.value) === 1;
  return (
    <g className="part-clickable">
      <Lead points="62,26 80,26" />
      <g filter={paint.shadow}>
        <rect x={4} y={8} width={60} height={36} rx={6} fill={paint.pcb("red")} />
        <rect x={14} y={18} width={34} height={16} rx={8} fill="#111827" />
        <circle cx={on ? 40 : 22} cy={26} r={7} fill={paint.metal} />
      </g>
      <Silk x={56} y={16} size={7}>
        {on ? "1" : "0"}
      </Silk>
      <circle cx={56} cy={34} r={2.6} fill={on ? LED_COLORS.green : "#1f2937"} />
    </g>
  );
}

function ProbeArt({ state }: PartArtProps) {
  const on = Boolean(state?.on);
  return (
    <g>
      <Lead points="0,26 18,26" />
      <g filter={paint.shadow}>
        <rect x={16} y={8} width={48} height={36} rx={6} fill={paint.pcb("black")} />
      </g>
      {on && <circle cx={40} cy={26} r={16} fill={LED_COLORS.green} opacity={0.6} filter={paint.glow} />}
      <circle cx={40} cy={26} r={10} fill={on ? paint.led("green") : "#1f2937"} stroke="#0f172a" />
      <Silk x={40} y={29} size={8} tone={on ? "ink" : "silk"}>
        {state?.value === null || state?.value === undefined ? "?" : String(state.value)}
      </Silk>
    </g>
  );
}

const IO_H = 52;

export const logicParts: Record<string, PartFactory> = {
  ...Object.fromEntries(Object.keys(SYMBOL).map((key) => [key, dip])),
  clock: () => ({ width: 80, height: IO_H, pins: [{ name: "out", side: "right", x: 80, y: 26 }], Art: ClockArt }),
  input: () => ({
    width: 80,
    height: IO_H,
    pins: [{ name: "out", side: "right", x: 80, y: 26 }],
    Art: SwitchArt,
    interact: (params) => ({ ...params, value: toNumber(params.value) === 1 ? 0 : 1 }),
  }),
  output: () => ({ width: 66, height: IO_H, pins: [{ name: "in", side: "left", x: 0, y: 26 }], Art: ProbeArt }),
};
