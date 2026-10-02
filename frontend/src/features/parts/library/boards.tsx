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
  esp32_s2: { color: "black", orientation: "vertical", module: "shield", moduleLabel: "ESP32-S2" },
  esp32_s3: { color: "black", orientation: "vertical", module: "shield", moduleLabel: "ESP32-S3" },
  esp32_c3: { color: "black", orientation: "vertical", module: "shield", moduleLabel: "ESP32-C3" },
  esp32_c6: { color: "black", orientation: "vertical", module: "shield", moduleLabel: "ESP32-C6" },
  esp32_cam: { color: "black", orientation: "vertical", module: "shield", moduleLabel: "ESP32-CAM" },
  arduino_nano: { color: "teal", orientation: "horizontal", module: "dip", moduleLabel: "ATMEGA328P" },
  arduino_mini: { color: "teal", orientation: "horizontal", module: "dip", moduleLabel: "ATMEGA328P" },
  arduino_mega: { color: "teal", orientation: "horizontal", module: "dip", moduleLabel: "ATMEGA2560" },
  arduino_leonardo: { color: "teal", orientation: "horizontal", module: "dip", moduleLabel: "ATMEGA32U4" },
  arduino_micro: { color: "teal", orientation: "horizontal", module: "dip", moduleLabel: "ATMEGA32U4" },
  stm32_blackpill: { color: "blue", orientation: "horizontal", module: "qfp", moduleLabel: "STM32F411" },
  rp2040_pico_w: { color: "green", orientation: "vertical", module: "qfp", moduleLabel: "RP2040" },
  teensy40: { color: "green", orientation: "horizontal", module: "qfp", moduleLabel: "IMXRT1062" },
  raspberry_pi_zero: { color: "green", orientation: "horizontal", module: "qfp", moduleLabel: "BCM2710" },
  raspberry_pi_3: { color: "green", orientation: "horizontal", module: "qfp", moduleLabel: "BCM2837" },
  raspberry_pi_4: { color: "green", orientation: "horizontal", module: "qfp", moduleLabel: "BCM2711" },
  raspberry_pi_5: { color: "red", orientation: "horizontal", module: "qfp", moduleLabel: "BCM2712" },
  orange_pi_zero: { color: "red", orientation: "horizontal", module: "qfp", moduleLabel: "H618" },
  orange_pi_5: { color: "red", orientation: "horizontal", module: "qfp", moduleLabel: "RK3588S" },
  banana_pi_m2: { color: "green", orientation: "horizontal", module: "qfp", moduleLabel: "H3" },
  radxa_rock5: { color: "black", orientation: "horizontal", module: "qfp", moduleLabel: "RK3588" },
  radxa_zero: { color: "purple", orientation: "horizontal", module: "qfp", moduleLabel: "H616" },
  beaglebone_black: { color: "green", orientation: "horizontal", module: "qfp", moduleLabel: "AM335x" },
  jetson_nano: { color: "green", orientation: "horizontal", module: "qfp", moduleLabel: "TEGRA X1" },
  milkv_duo: { color: "red", orientation: "horizontal", module: "qfp", moduleLabel: "CV1800B" },
  milkv_mars: { color: "purple", orientation: "horizontal", module: "qfp", moduleLabel: "JH7110" },
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
