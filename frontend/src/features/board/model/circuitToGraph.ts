import type { Circuit, ComponentDef } from "../../../domain";
import type { PartNodeType, WireEdgeType } from "../nodes/types";
import { createPartNode } from "./nodeFactory";
import { pickWireColor } from "./wireColors";

export function circuitToGraph(
  circuit: Circuit,
  catalog: ReadonlyMap<string, ComponentDef>,
): { nodes: PartNodeType[]; edges: WireEdgeType[] } {
  const defs = new Map(circuit.instances.map((inst) => [inst.id, catalog.get(inst.component_key)]));

  const nodes = circuit.instances.flatMap((inst) => {
    const def = defs.get(inst.id);
    if (!def) return [];
    return [createPartNode({ id: inst.id, def, position: inst.position, label: inst.label, params: inst.params })];
  });

  const edges = circuit.nets.flatMap((net, index) => {
    if (net.id.startsWith("bb:")) return [];
    const [first, ...rest] = net.endpoints.map((point) => point.split(":") as [string, string]);
    if (!first) return [];
    const [source, sourceHandle] = first;
    return rest.map(([target, targetHandle], j): WireEdgeType => ({
      id: `${net.id}_${j}`,
      type: "wire",
      source,
      sourceHandle,
      target,
      targetHandle,
      data: {
        color: pickWireColor(
          [
            [defs.get(source), sourceHandle],
            [defs.get(target), targetHandle],
          ],
          index,
        ),
      },
    }));
  });

  return { nodes, edges };
}
