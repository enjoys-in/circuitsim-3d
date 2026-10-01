import type { ComponentType } from "react";
import type { ComponentDef, InstanceState, Params } from "../../../domain";
import { pinRow } from "../layout";
import { type PcbColor } from "../paint";
import { HeaderPin } from "../primitives/HeaderPin";
import { Pcb } from "../primitives/Pcb";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory, PartSpec } from "../types";

const PITCH = 16;
const EDGE = 7;

export interface DecorProps {
  width: number;
  height: number;
  params: Params;
  state?: InstanceState;
}

export interface ModuleConfig {
  color: PcbColor;
  title: string;
  minWidth?: number;
  height?: number;
  leftPins?: string[];
  Decor?: ComponentType<DecorProps>;
  interact?: (params: Params) => Params;
  readout?: (params: Params, state?: InstanceState) => string | null;
}

interface Layout {
  width: number;
  height: number;
  pins: PartSpec["pins"];
  labelAt: Record<string, "above" | "right" | "left">;
}

function layout(def: ComponentDef, config: ModuleConfig): Layout {
  const names = def.pins.map((p) => p.name);
  if (config.leftPins) {
    const left = names.filter((n) => config.leftPins?.includes(n));
    const right = names.filter((n) => !config.leftPins?.includes(n));
    const rows = Math.max(left.length, right.length);
    const width = config.minWidth ?? 110;
    const height = Math.max(config.height ?? 64, rows * PITCH + 24);
    const start = (height - (rows - 1) * PITCH) / 2;
    return {
      width,
      height,
      pins: [...pinRow(left, "left", start, PITCH, EDGE), ...pinRow(right, "right", start, PITCH, width - EDGE)],
      labelAt: Object.fromEntries([...left.map((n) => [n, "right"]), ...right.map((n) => [n, "left"])]),
    };
  }
  const width = Math.max(config.minWidth ?? 84, names.length * PITCH + 20);
  const height = config.height ?? 72;
  const start = (width - (names.length - 1) * PITCH) / 2;
  return {
    width,
    height,
    pins: pinRow(names, "bottom", start, PITCH, height - EDGE),
    labelAt: Object.fromEntries(names.map((n) => [n, "above"])),
  };
}

export function moduleFactory(config: ModuleConfig): PartFactory {
  return (def) => {
    const shape = layout(def, config);
    function ModuleArt({ params, state }: PartArtProps) {
      const { Decor } = config;
      return (
        <g>
          <Pcb width={shape.width} height={shape.height} color={config.color} />
          {Decor && <Decor width={shape.width} height={shape.height} params={params} state={state} />}
          <Silk x={shape.width / 2} y={12} size={6.5}>
            {config.title}
          </Silk>
          {shape.pins.map((pin) => (
            <HeaderPin key={pin.name} x={pin.x} y={pin.y} label={pin.name} labelAt={shape.labelAt[pin.name]} />
          ))}
        </g>
      );
    }
    return {
      width: shape.width,
      height: shape.height,
      pins: shape.pins,
      Art: ModuleArt,
      interact: config.interact,
      readout: config.readout,
    };
  };
}
