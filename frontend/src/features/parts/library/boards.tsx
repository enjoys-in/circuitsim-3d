import type { ComponentDef } from "../../../domain";
import { pinRow, splitHalves } from "../layout";
import { LED_COLORS, paint, type PcbColor } from "../paint";
import { Chip } from "../primitives/Chip";
import { HeaderPin } from "../primitives/HeaderPin";
import { Pcb } from "../primitives/Pcb";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory, PartPin } from "../types";
import { UsbPort } from "./decor";

interface BoardStyle {
  color: PcbColor;
  orientation: "vertical" | "horizontal";
  module: "shield" | "dip" | "qfp";
  moduleLabel: string;
}

const STYLES: Record<string, BoardStyle> = {
  esp32_devkit: { color: "black", orientation: "vertical", module: "shield", moduleLabel: "ESP-WROOM-32" },
  esp8266: { color: "black", orientation: "vertical", module: "shield", moduleLabel: "ESP-12E" },
  arduino_uno: { color: "teal", orientation: "horizontal", module: "dip", moduleLabel: "ATMEGA328P" },
  stm32_bluepill: { color: "blue", orientation: "horizontal", module: "qfp", moduleLabel: "STM32F103" },
  rp2040_pico: { color: "green", orientation: "vertical", module: "qfp", moduleLabel: "RP2040" },
};

const PITCH = 16;
const EDGE = 8;

interface Geometry {
  width: number;
  height: number;
  pins: PartPin[];
}

function geometry(def: ComponentDef, style: BoardStyle): Geometry {
  const [first, second] = splitHalves(def.pins.map((p) => p.name));
  const rows = Math.max(first.length, second.length);
  if (style.orientation === "vertical") {
    const width = 170;
    const height = rows * PITCH + 110;
    const start = 92;
    return {
      width,
      height,
      pins: [...pinRow(first, "left", start, PITCH, EDGE), ...pinRow(second, "right", start, PITCH, width - EDGE)],
    };
  }
  const width = rows * PITCH + 90;
  const height = 170;
  const start = 70;
  return {
    width,
    height,
    pins: [...pinRow(first, "top", start, PITCH, EDGE), ...pinRow(second, "bottom", start, PITCH, height - EDGE)],
  };
}

function Module({ style, x, y, width }: { style: BoardStyle; x: number; y: number; width: number }) {
  if (style.module === "shield") {
    return (
      <g>
        <rect x={x} y={y} width={width} height={20} fill="#111827" />
        <path
          d={`M${x + 8},${y + 16} v-10 h8 v10 h8 v-10 h8 v10 h8 v-10 h8 v10`}
          fill="none"
          stroke={paint.gold}
          strokeWidth={1.6}
        />
        <rect x={x} y={y + 20} width={width} height={48} rx={2} fill={paint.metal} filter={paint.shadow} />
        <Silk x={x + width / 2} y={y + 48} size={7} tone="ink">
          {style.moduleLabel}
        </Silk>
      </g>
    );
  }
  return (
    <Chip
      x={x}
      y={y}
      width={width}
      height={style.module === "dip" ? 22 : width}
      label={style.moduleLabel}
      legs={style.module}
      legCount={style.module === "dip" ? 10 : 6}
    />
  );
}

function SmdLed({ x, y, color, on, label }: { x: number; y: number; color: string; on: boolean; label: string }) {
  return (
    <g>
      {on && <circle cx={x} cy={y} r={9} fill={color} opacity={0.8} filter={paint.glow} />}
      <rect x={x - 3.5} y={y - 2.5} width={7} height={5} rx={1} fill={on ? color : "#e5e7eb"} />
      <Silk x={x} y={y + 10} size={5.5}>
        {label}
      </Silk>
    </g>
  );
}

function boardArt(style: BoardStyle, shape: Geometry) {
  const { width, height } = shape;
  const vertical = style.orientation === "vertical";
  return function BoardArt({ def, state }: PartArtProps) {
    const running = state?.on !== false;
    const moduleWidth = vertical ? width - 56 : 90;
    return (
      <g>
        <Pcb width={width} height={height} color={style.color} radius={6} />
        {vertical ? (
          <>
            <Module style={style} x={28} y={10} width={moduleWidth} />
            <UsbPort x={width / 2} y={height - 10} />
            <SmdLed x={width / 2 - 28} y={height - 30} color={LED_COLORS.red} on={running} label="PWR" />
            <SmdLed x={width / 2 + 28} y={height - 30} color={LED_COLORS.blue} on={Boolean(state?.onboard_led)} label="LED" />
          </>
        ) : (
          <>
            <UsbPort x={20} y={50} micro={false} />
            <Module style={style} x={width / 2 - 45} y={style.module === "dip" ? 100 : 60} width={moduleWidth} />
            <SmdLed x={width - 40} y={60} color={LED_COLORS.green} on={running} label="ON" />
            <SmdLed x={width - 40} y={84} color={LED_COLORS.orange} on={Boolean(state?.onboard_led)} label="L" />
          </>
        )}
        <Silk x={width / 2} y={vertical ? height - 44 : height / 2 - 8} size={8}>
          {def.name}
        </Silk>
        {state?.fault && (
          <g>
            <circle cx={width - 18} cy={18} r={9} fill="#dc2626" />
            <Silk x={width - 18} y={22} size={11}>
              !
            </Silk>
          </g>
        )}
        {shape.pins.map((pin) => (
          <HeaderPin
            key={pin.name}
            x={pin.x}
            y={pin.y}
            label={pin.name}
            labelAt={pin.side === "left" ? "right" : pin.side === "right" ? "left" : pin.side === "top" ? "below" : "above"}
          />
        ))}
      </g>
    );
  };
}

const devBoard: PartFactory = (def) => {
  const style = STYLES[def.key] ?? STYLES.esp32_devkit;
  const shape = geometry(def, style);
  return { ...shape, Art: boardArt(style, shape) };
};

export const boardParts: Record<string, PartFactory> = Object.fromEntries(
  Object.keys(STYLES).map((key) => [key, devBoard]),
);

export { devBoard };
