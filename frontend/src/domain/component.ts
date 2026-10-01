export type PinDirection =
  | "input"
  | "output"
  | "bidirectional"
  | "power"
  | "ground"
  | "passive";

export type ComponentCategory =
  | "passive"
  | "semiconductor"
  | "power"
  | "sensor"
  | "dev_board"
  | "logic"
  | "actuator"
  | "connector"
  | "pcb";

export interface Pin {
  name: string;
  direction: PinDirection;
  x: number;
  y: number;
}

export type Params = Record<string, unknown>;

export interface ComponentDef {
  id: string;
  key: string;
  name: string;
  category: ComponentCategory;
  subcategory: string | null;
  description: string;
  pins: Pin[];
  default_params: Params;
  spice_model: string | null;
  footprint: string | null;
  symbol: string | null;
  tags: string[];
}
