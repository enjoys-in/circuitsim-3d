import type { Circuit, ComponentDef } from "../../../domain";
import { getFootprint } from "./footprints";
import { distance, padWorld } from "./geometry";
import type { Airwire, Layer, Placement, Point, Trace, Via } from "./pcbTypes";
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
  // Wires that share a pin belong to one electrical net; union them so a pin with
  // several wires resolves to a single net (not just the last wire seen).
  const nets = new DSU();
  const hasNet = new Set<string>();
  for (const net of circuit.nets) {
    const [first, ...rest] = net.endpoints;
    if (!first) continue;
    hasNet.add(first);
    nets.find(first);
    for (const endpoint of rest) {
      hasNet.add(endpoint);
      nets.union(first, endpoint);
    }
  }

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
        netId: hasNet.has(id) ? nets.find(id) : null,
        point: padWorld({ x: pad.x, y: pad.y }, placement, footprint),
      });
    }
  }
  return pads;
}

function buildConnectivity(pads: PadInfo[], traces: Trace[], vias: Via[]): DSU {
  const dsu = new DSU();
  // Pads are through-hole and vias bridge layers, so both connect to any layer.
  type NodeLayer = Layer | "any";
  const nodes: { id: string; point: Point; layer: NodeLayer }[] = [
    ...pads.map((p) => ({ id: p.id, point: p.point, layer: "any" as NodeLayer })),
    ...vias.map((v) => ({ id: `via:${v.id}`, point: { x: v.x, y: v.y }, layer: "any" as NodeLayer })),
  ];
  for (const trace of traces) {
    const start = `trace:${trace.id}:0`;
    const end = `trace:${trace.id}:1`;
    dsu.union(start, end);
    nodes.push({ id: start, point: trace.points[0], layer: trace.layer });
    nodes.push({ id: end, point: trace.points[trace.points.length - 1], layer: trace.layer });
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (distance(a.point, b.point) > COINCIDENT) continue;
      // Copper on different layers only joins through a pad or via.
      if (a.layer !== "any" && b.layer !== "any" && a.layer !== b.layer) continue;
      dsu.union(a.id, b.id);
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
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id);
    if (p === undefined || p === id) return p ?? id;
    const r = find(p);
    parent.set(id, r);
    return r;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  // Pre-merge pads already connected by copper (shared connectivity root).
  const copperRep = new Map<string, string>();
  for (const pad of pads) {
    const cr = root(pad.id);
    const rep = copperRep.get(cr);
    if (rep) union(rep, pad.id);
    else copperRep.set(cr, pad.id);
  }

  const wires: Airwire[] = [];
  for (let step = 0; step < pads.length - 1; step++) {
    let best: { a: PadInfo; b: PadInfo; d: number } | null = null;
    for (let i = 0; i < pads.length; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        if (find(pads[i].id) === find(pads[j].id)) continue;
        const d = distance(pads[i].point, pads[j].point);
        if (!best || d < best.d) best = { a: pads[i], b: pads[j], d };
      }
    }
    if (!best) break;
    union(best.a.id, best.b.id);
    wires.push({ netId, a: best.a.point, b: best.b.point });
  }
  return wires;
}
