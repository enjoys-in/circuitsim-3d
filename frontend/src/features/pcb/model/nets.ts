import type { Circuit, ComponentDef } from "../../../domain";
import { getFootprint } from "./footprints";
import { distance, padWorld } from "./geometry";
import type { Airwire, Placement, Point, Trace, Via } from "./pcbTypes";
import { padId } from "./pcbTypes";

export interface PadInfo {
  id: string;
  instanceId: string;
  name: string;
  netId: string | null;
  point: Point;
}

const COINCIDENT = 2;

class DSU {
  private parent = new Map<string, string>();

  find(x: string): string {
    const p = this.parent.get(x) ?? x;
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  union(a: string, b: string): void {
    this.parent.set(this.find(a), this.find(b));
  }
}

export function collectPads(
  circuit: Circuit,
  catalog: ReadonlyMap<string, ComponentDef>,
  placements: Map<string, Placement>,
): PadInfo[] {
  const netOf = new Map<string, string>();
  for (const net of circuit.nets) for (const endpoint of net.endpoints) netOf.set(endpoint, net.id);

  const pads: PadInfo[] = [];
  for (const inst of circuit.instances) {
    const def = catalog.get(inst.component_key);
    const placement = placements.get(inst.id);
    if (!def || !placement) continue;
    const footprint = getFootprint(def);
    for (const pad of footprint.pads) {
      const id = padId(inst.id, pad.name);
      pads.push({
        id,
        instanceId: inst.id,
        name: pad.name,
        netId: netOf.get(id) ?? null,
        point: padWorld({ x: pad.x, y: pad.y }, placement, footprint),
      });
    }
  }
  return pads;
}

function buildConnectivity(pads: PadInfo[], traces: Trace[], vias: Via[]): DSU {
  const dsu = new DSU();
  const nodes: { id: string; point: Point }[] = [
    ...pads.map((p) => ({ id: p.id, point: p.point })),
    ...vias.map((v) => ({ id: `via:${v.id}`, point: { x: v.x, y: v.y } })),
  ];
  for (const trace of traces) {
    const start = `trace:${trace.id}:0`;
    const end = `trace:${trace.id}:1`;
    dsu.union(start, end);
    nodes.push({ id: start, point: trace.points[0] });
    nodes.push({ id: end, point: trace.points[trace.points.length - 1] });
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (distance(nodes[i].point, nodes[j].point) <= COINCIDENT) dsu.union(nodes[i].id, nodes[j].id);
    }
  }
  return dsu;
}

export interface Connectivity {
  routedNets: Set<string>;
  airwires: Airwire[];
  rootOf: (padId: string) => string;
}

export function analyzeNets(pads: PadInfo[], traces: Trace[], vias: Via[]): Connectivity {
  const dsu = buildConnectivity(pads, traces, vias);
  const byNet = new Map<string, PadInfo[]>();
  for (const pad of pads) {
    if (pad.netId) byNet.set(pad.netId, [...(byNet.get(pad.netId) ?? []), pad]);
  }

  const routedNets = new Set<string>();
  const airwires: Airwire[] = [];
  for (const [netId, netPads] of byNet) {
    if (netPads.length < 2) {
      routedNets.add(netId);
      continue;
    }
    const remaining = mstAirwires(netId, netPads, (id) => dsu.find(id));
    if (remaining.length === 0) routedNets.add(netId);
    airwires.push(...remaining);
  }
  return { routedNets, airwires, rootOf: (id) => dsu.find(id) };
}

// Greedy MST over pads, skipping pairs already joined by copper (same DSU root).
function mstAirwires(netId: string, pads: PadInfo[], root: (id: string) => string): Airwire[] {
  const group = new Map<string, string>();
  const rep = (id: string) => group.get(id) ?? id;
  const merge = (a: string, b: string) => group.set(rep(a), rep(b));
  for (const pad of pads) group.set(pad.id, root(pad.id));

  const wires: Airwire[] = [];
  for (let step = 0; step < pads.length - 1; step++) {
    let best: { a: PadInfo; b: PadInfo; d: number } | null = null;
    for (let i = 0; i < pads.length; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        if (rep(pads[i].id) === rep(pads[j].id)) continue;
        const d = distance(pads[i].point, pads[j].point);
        if (!best || d < best.d) best = { a: pads[i], b: pads[j], d };
      }
    }
    if (!best) break;
    merge(best.a.id, best.b.id);
    if (root(best.a.id) !== root(best.b.id)) wires.push({ netId, a: best.a.point, b: best.b.point });
  }
  return wires;
}
