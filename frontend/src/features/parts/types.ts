import type { ComponentType } from "react";
import type { ComponentDef, InstanceState, Params } from "../../domain";

export type PinSide = "left" | "right" | "top" | "bottom";

export interface PartPin {
  name: string;
  x: number;
  y: number;
  side: PinSide;
}

export interface PartArtProps {
  def: ComponentDef;
  params: Params;
  state?: InstanceState;
}

export interface PartSpec {
  width: number;
  height: number;
  pins: PartPin[];
  Art: ComponentType<PartArtProps>;
  interact?: (params: Params) => Params;
  readout?: (params: Params, state?: InstanceState) => string | null;
}

export type PartFactory = (def: ComponentDef) => PartSpec;
