import { LED_COLORS, paint } from "../paint";
import { Chip } from "../primitives/Chip";
import { Silk } from "../primitives/Silk";
import type { DecorProps } from "./modules";

function SmdLed({ x, y, color, on }: { x: number; y: number; color: string; on: boolean }) {
  return (
    <g>
      {on && <circle cx={x} cy={y} r={7} fill={color} opacity={0.7} filter={paint.glow} />}
      <rect x={x - 3} y={y - 2} width={6} height={4} rx={1} fill={on ? color : "#e5e7eb"} />
    </g>
  );
}

export function UsbPort({ x, y, micro = true }: { x: number; y: number; micro?: boolean }) {
  const w = micro ? 18 : 30;
  const h = micro ? 7 : 24;
  return (
    <g filter={paint.shadow}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={micro ? 2 : 1.5} fill={paint.metal} />
      <rect x={x - w / 2 + 3} y={y - h / 2 + 2} width={w - 6} height={h - 4} rx={1} fill="#475569" />
    </g>
  );
}

export function Tp4056Decor({ width, height, state }: DecorProps) {
  const charging = Boolean(state?.on);
  return (
    <g>
      <UsbPort x={width / 2} y={20} />
      <Chip x={width / 2 - 14} y={height / 2 - 6} width={28} height={16} label="TP4056" legs="dip" legCount={4} />
      <SmdLed x={width / 2 - 14} y={height - 16} color={LED_COLORS.red} on={charging} />
      <SmdLed x={width / 2 + 14} y={height - 16} color={LED_COLORS.blue} on={!charging && state !== undefined} />
    </g>
  );
}

export function BmsDecor({ width, height }: DecorProps) {
  return (
    <g>
      <Chip x={width / 2 - 26} y={height / 2 - 8} width={20} height={14} label="DW01" legs="dip" legCount={3} />
      <Chip x={width / 2 + 4} y={height / 2 - 8} width={22} height={14} label="8205A" legs="dip" legCount={4} />
    </g>
  );
}

export function ShuntDecor({ width, state }: DecorProps) {
  const current = state?.readings?.current;
  return (
    <g>
      <rect x={width / 2 - 16} y={19} width={32} height={10} rx={1} fill="#f8fafc" filter={paint.shadow} />
      <Silk x={width / 2} y={26.5} size={6} tone="ink">
        R100
      </Silk>
      <Chip x={width / 2 - 10} y={34} width={20} height={12} label="219" legs="dip" legCount={3} />
      {current !== undefined && (
        <Silk x={width / 2} y={58} size={6}>
          {`${(current * 1000).toFixed(1)} mA`}
        </Silk>
      )}
    </g>
  );
}

export function ConverterDecor({ width, height, state }: DecorProps) {
  return (
    <g>
      <rect x={14} y={height / 2 - 12} width={24} height={24} rx={3} fill="#27272a" filter={paint.shadow} />
      <Silk x={26} y={height / 2 + 3} size={7} tone="dim">
        220
      </Silk>
      <rect x={width - 40} y={height / 2 - 9} width={18} height={18} rx={2} fill="#1d4ed8" filter={paint.shadow} />
      <circle cx={width - 31} cy={height / 2} r={4.5} fill={paint.metal} />
      <Chip x={width / 2 - 10} y={height / 2 - 7} width={18} height={14} legs="dip" legCount={3} />
      <SmdLed x={width - 20} y={18} color={LED_COLORS.red} on={Boolean(state?.on)} />
    </g>
  );
}

export function EnvSensorDecor({ width }: DecorProps) {
  return (
    <g filter={paint.shadow}>
      <rect x={width / 2 - 9} y={22} width={18} height={18} rx={2} fill={paint.metal} />
      <circle cx={width / 2 + 4} cy={27} r={1.6} fill="#334155" />
    </g>
  );
}

export function ImuDecor({ width }: DecorProps) {
  return <Chip x={width / 2 - 12} y={20} width={24} height={24} label="MPU" sublabel="6050" legs="qfp" legCount={4} />;
}

export function GpsDecor({ width, height }: DecorProps) {
  return (
    <g filter={paint.shadow}>
      <rect x={width / 2 - 22} y={18} width={44} height={height - 38} rx={3} fill="#d6c7a1" />
      <rect x={width / 2 - 14} y={24} width={28} height={height - 50} rx={2} fill="#c9b27c" />
      <circle cx={width / 2} cy={18 + (height - 38) / 2} r={3} fill={paint.metal} />
    </g>
  );
}
