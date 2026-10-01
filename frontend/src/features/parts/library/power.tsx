import { formatSI, toNumber } from "../../../shared/lib/format";
import { paint } from "../paint";
import { Lead } from "../primitives/Lead";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory } from "../types";
import { BmsDecor, ConverterDecor, ShuntDecor, Tp4056Decor } from "./decor";
import { moduleFactory } from "./modules";

function GroundArt() {
  return (
    <g>
      <Lead points="30,0 30,18" />
      <g filter={paint.shadow}>
        <circle cx={30} cy={30} r={13} fill="#111827" />
        <circle cx={30} cy={30} r={8} fill={paint.metal} />
        <circle cx={30} cy={30} r={3} fill="#1f2937" />
      </g>
      <path d="M20,50 h20 M23,54 h14 M26,58 h8" stroke="#94a3b8" strokeWidth={1.6} />
    </g>
  );
}

function BenchSupplyArt({ params, state }: PartArtProps) {
  const volts = toNumber(params.voltage, 5);
  const amps = state?.current ?? 0;
  return (
    <g>
      <g filter={paint.shadow}>
        <rect x={0} y={0} width={130} height={92} rx={8} fill="#334155" />
        <rect x={4} y={4} width={122} height={84} rx={6} fill="#475569" />
      </g>
      <rect x={10} y={10} width={74} height={34} rx={3} fill="#0b1f14" />
      <Silk x={78} y={26} size={12} anchor="end" tone="lcd">
        {`${volts.toFixed(2)}V`}
      </Silk>
      <Silk x={78} y={39} size={9} anchor="end" tone="lcd">
        {`${amps.toFixed(3)}A`}
      </Silk>
      <circle cx={106} cy={27} r={12} fill="#1f2937" filter={paint.shadow} />
      <circle cx={106} cy={27} r={8} fill={paint.metal} />
      <circle cx={34} cy={72} r={9} fill="#dc2626" filter={paint.shadow} />
      <circle cx={34} cy={72} r={3.5} fill={paint.gold} />
      <circle cx={96} cy={72} r={9} fill="#111827" filter={paint.shadow} />
      <circle cx={96} cy={72} r={3.5} fill={paint.gold} />
      <Silk x={34} y={58} size={7}>
        +
      </Silk>
      <Silk x={96} y={58} size={7}>
        −
      </Silk>
    </g>
  );
}

function LipoArt({ params }: PartArtProps) {
  return (
    <g>
      <path d="M118,20 C130,20 130,20 140,20" stroke="#dc2626" strokeWidth={3} fill="none" />
      <path d="M118,44 C130,44 130,44 140,44" stroke="#111827" strokeWidth={3} fill="none" />
      <g filter={paint.shadow}>
        <rect x={0} y={4} width={120} height={56} rx={6} fill={paint.metal} />
        <rect x={10} y={12} width={96} height={40} rx={3} fill="#facc15" />
      </g>
      <Silk x={58} y={29} size={9} tone="ink">
        {`${toNumber(params.voltage, 3.7)}V LiPo`}
      </Silk>
      <Silk x={58} y={42} size={7} tone="ink">
        {`${toNumber(params.capacity_mah, 1000)} mAh`}
      </Silk>
    </g>
  );
}

function To220Art({ params }: PartArtProps) {
  return (
    <g>
      {[18, 36, 54].map((x) => (
        <Lead key={x} points={`${x},60 ${x},84`} />
      ))}
      <g filter={paint.shadow}>
        <rect x={6} y={0} width={60} height={26} rx={2} fill={paint.metal} />
        <circle cx={36} cy={12} r={5} fill="#1f2937" />
        <rect x={6} y={24} width={60} height={36} rx={2} fill={paint.plastic} />
      </g>
      <Silk x={36} y={40} size={7} tone="dim">
        {String(params.model ?? "LDO")}
      </Silk>
      <Silk x={36} y={52} size={7} tone="dim">
        {`${toNumber(params.vout, 3.3)}V`}
      </Silk>
    </g>
  );
}

const regulatorReadout = (params: Record<string, unknown>) => `${toNumber(params.vout, 3.3)} V out`;

export const powerParts: Record<string, PartFactory> = {
  ground: () => ({ width: 60, height: 62, pins: [{ name: "gnd", side: "top", x: 30, y: 0 }], Art: GroundArt }),
  dc_supply: () => ({
    width: 130,
    height: 92,
    pins: [
      { name: "+", side: "bottom", x: 34, y: 72 },
      { name: "-", side: "bottom", x: 96, y: 72 },
    ],
    Art: BenchSupplyArt,
  }),
  battery_lipo: () => ({
    width: 140,
    height: 64,
    pins: [
      { name: "+", side: "right", x: 140, y: 20 },
      { name: "-", side: "right", x: 140, y: 44 },
    ],
    Art: LipoArt,
    readout: (_, state) => (state?.current !== undefined ? formatSI(state.current, "A") : null),
  }),
  ldo_regulator: () => ({
    width: 72,
    height: 84,
    pins: [
      { name: "vin", side: "bottom", x: 18, y: 84 },
      { name: "gnd", side: "bottom", x: 36, y: 84 },
      { name: "vout", side: "bottom", x: 54, y: 84 },
    ],
    Art: To220Art,
  }),
  buck_converter: moduleFactory({ color: "blue", title: "BUCK", minWidth: 120, Decor: ConverterDecor, readout: regulatorReadout }),
  boost_converter: moduleFactory({ color: "red", title: "BOOST", minWidth: 120, Decor: ConverterDecor, readout: regulatorReadout }),
  tp4056_charger: moduleFactory({ color: "blue", title: "TP4056", minWidth: 110, height: 80, leftPins: ["in+", "in-"], Decor: Tp4056Decor }),
  bms_1s: moduleFactory({ color: "green", title: "1S BMS", minWidth: 110, leftPins: ["b+", "b-"], Decor: BmsDecor }),
  ina219: moduleFactory({ color: "purple", title: "INA219", minWidth: 110, height: 84, Decor: ShuntDecor }),
};
