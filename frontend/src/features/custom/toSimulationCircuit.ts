import type { Circuit, ComponentDef } from "../../domain";
import { CUSTOM_BASE_KEYS } from "./customBases";

// A custom part with a base behaviour (def.spice_model) simulates as that base,
// while keeping its custom key/name/art on the board.
export function toSimulationCircuit(
  circuit: Circuit,
  byKey: ReadonlyMap<string, ComponentDef>,
): Circuit {
  let changed = false;
  const instances = circuit.instances.map((inst) => {
    const base = byKey.get(inst.component_key)?.spice_model;
    if (base && CUSTOM_BASE_KEYS.has(base)) {
      changed = true;
      return { ...inst, component_key: base };
    }
    return inst;
  });
  return changed ? { ...circuit, instances } : circuit;
}
