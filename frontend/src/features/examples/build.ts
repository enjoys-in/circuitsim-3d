import type { Circuit, ComponentInstance, SimulationOptions } from "../../domain";

export type ExampleCategory = "Analog" | "Power" | "Digital" | "MCU";

export interface Example {
  id: string;
  title: string;
  category: ExampleCategory;
  description: string;
  circuit: Circuit;
  options?: Partial<SimulationOptions>;
}

export type PartSpec = [id: string, key: string, x: number, y: number, params?: Record<string, unknown>];

export function build(parts: PartSpec[], wires: [string, string][]): Circuit {
  const instances: ComponentInstance[] = parts.map(([id, key, x, y, params]) => ({
    id,
    component_key: key,
    label: id,
    position: { x, y },
    params: params ?? {},
  }));
  const nets = wires.map(([a, b], i) => ({ id: `n${i}`, name: "", endpoints: [a, b] }));
  return { instances, nets };
}
