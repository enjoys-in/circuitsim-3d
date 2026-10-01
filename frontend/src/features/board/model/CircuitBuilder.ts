import type { Circuit } from "../../../domain";
import { BREADBOARD_KEY, getBreadboardLayout } from "../../parts/library/breadboardModel";
import type { PartNodeType, WireEdgeType } from "../nodes/types";

export class CircuitBuilder {
  private instances: Circuit["instances"] = [];
  private nets: Circuit["nets"] = [];

  fromNodes(nodes: PartNodeType[]): this {
    this.instances = nodes.map((node) => ({
      id: node.id,
      component_key: node.data.def.key,
      label: node.data.label,
      position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
      params: node.data.params,
    }));
    return this;
  }

  fromEdges(edges: WireEdgeType[]): this {
    this.nets = edges
      .filter((edge) => edge.sourceHandle && edge.targetHandle)
      .map((edge) => ({
        id: edge.id,
        name: "",
        endpoints: [`${edge.source}:${edge.sourceHandle}`, `${edge.target}:${edge.targetHandle}`],
      }));
    return this;
  }

  build(): Circuit {
    return { instances: this.instances, nets: [...this.nets, ...this.breadboardNets()] };
  }

  // Columns of 5 holes and the power rails are internally common; emit those as
  // synthetic nets (only for strips something is wired to) so the backend unions them.
  private breadboardNets(): Circuit["nets"] {
    const boards = this.instances.filter((i) => i.component_key === BREADBOARD_KEY);
    if (boards.length === 0) return [];
    const used = new Set<string>();
    for (const net of this.nets) for (const point of net.endpoints) used.add(point);
    const layout = getBreadboardLayout();
    const nets: Circuit["nets"] = [];
    for (const board of boards) {
      layout.strips.forEach((strip, i) => {
        if (!strip.some((hole) => used.has(`${board.id}:${hole}`))) return;
        nets.push({
          id: `bb:${board.id}:${i}`,
          name: "",
          endpoints: strip.map((hole) => `${board.id}:${hole}`),
        });
      });
    }
    return nets;
  }
}

export function electricalKey(circuit: Circuit): string {
  return JSON.stringify({
    instances: circuit.instances.map(({ id, component_key, label, params }) => [id, component_key, label, params]),
    nets: circuit.nets.map((net) => net.endpoints),
  });
}
