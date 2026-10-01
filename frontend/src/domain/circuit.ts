import type { Params } from "./component";

export interface Position {
  x: number;
  y: number;
}

export interface ComponentInstance {
  id: string;
  component_key: string;
  label: string;
  position: Position;
  params: Params;
  rotation?: number;
  flip?: boolean;
}

export interface Net {
  id: string;
  name: string;
  endpoints: string[];
  waypoints?: Position[];
}

export interface Circuit {
  instances: ComponentInstance[];
  nets: Net[];
}
