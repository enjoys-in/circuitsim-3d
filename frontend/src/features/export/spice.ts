import type { Circuit, ComponentDef, ComponentInstance, Net, Params, Position } from "../../domain";

// --- SPICE value parsing (handles 1k, 100n, 10u, 1meg, 1e-7, etc.) ---
const SUFFIX: Record<string, number> = {
  f: 1e-15,
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  µ: 1e-6,
  m: 1e-3,
  k: 1e3,
  meg: 1e6,
  g: 1e9,
  t: 1e12,
};

export function spiceNum(token: string | undefined): number {
  if (token === undefined) return 0;
  const match = /^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*(meg|[fpnuµmkgt])?/i.exec(token.trim());
  if (!match) return 0;
  const suffix = (match[2] ?? "").toLowerCase();
  return parseFloat(match[1]) * (suffix ? (SUFFIX[suffix] ?? 1) : 1);
}

function spiceFormat(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  return Number(value.toPrecision(6)).toString();
}

// ---------------------------- EXPORT ----------------------------

interface ExportSpec {
  prefix: string;
  a: string;
  b: string;
  valueKey?: string;
  suffix?: string; // e.g. "DC"
  model?: string; // e.g. "DLED"
}

const EXPORTS: Record<string, ExportSpec> = {
  resistor: { prefix: "R", a: "a", b: "b", valueKey: "resistance" },
  capacitor: { prefix: "C", a: "a", b: "b", valueKey: "capacitance" },
  electrolytic_cap: { prefix: "C", a: "+", b: "-", valueKey: "capacitance" },
  inductor: { prefix: "L", a: "a", b: "b", valueKey: "inductance" },
  dc_supply: { prefix: "V", a: "+", b: "-", valueKey: "voltage", suffix: "DC" },
  battery_lipo: { prefix: "V", a: "+", b: "-", valueKey: "voltage", suffix: "DC" },
  led: { prefix: "D", a: "anode", b: "cathode", model: "DLED" },
};

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "") || "X";
}

// Map the schematic circuit to a SPICE deck. Each net becomes a numbered node (the
// ground part's net is node 0); supported two-terminal parts become R/C/L/V/D cards.
export function buildSpice(circuit: Circuit, catalog: ReadonlyMap<string, ComponentDef>): string {
  const instById = new Map(circuit.instances.map((i) => [i.id, i]));
  const isGroundNet = (net: Net) =>
    net.endpoints.some((ep) => instById.get(ep.split(":")[0])?.component_key === "ground");

  const netNode = new Map<string, number>();
  let next = 1;
  for (const net of circuit.nets) if (isGroundNet(net)) netNode.set(net.id, 0);
  for (const net of circuit.nets) if (!netNode.has(net.id)) netNode.set(net.id, next++);

  const endpointNode = new Map<string, number>();
  for (const net of circuit.nets) for (const ep of net.endpoints) endpointNode.set(ep, netNode.get(net.id)!);
  let floating = 900;
  const nodeOf = (id: string, pin: string): number => endpointNode.get(`${id}:${pin}`) ?? floating++;

  const lines: string[] = ["* CircuitSim SPICE export"];
  let usesDiode = false;
  const seen = new Set<string>();

  for (const inst of circuit.instances) {
    const spec = EXPORTS[inst.component_key];
    if (!spec) {
      if (inst.component_key !== "ground") lines.push(`* ${inst.label || inst.id} (${inst.component_key}) not exported`);
      continue;
    }
    let ref = sanitize(inst.label || inst.id);
    if (!ref.toUpperCase().startsWith(spec.prefix)) ref = spec.prefix + ref;
    while (seen.has(ref.toUpperCase())) ref += "x";
    seen.add(ref.toUpperCase());

    const na = nodeOf(inst.id, spec.a);
    const nb = nodeOf(inst.id, spec.b);
    const def = catalog.get(inst.component_key);
    const parts = [ref, String(na), String(nb)];
    if (spec.suffix) parts.push(spec.suffix);
    if (spec.valueKey) {
      const raw = inst.params[spec.valueKey] ?? def?.default_params[spec.valueKey] ?? 0;
      parts.push(spiceFormat(spiceNum(String(raw))));
    }
    if (spec.model) {
      parts.push(spec.model);
      usesDiode = true;
    }
    lines.push(parts.join(" "));
  }

  if (usesDiode) lines.push(".model DLED D(IS=1e-14 N=1.8)");
  lines.push(".end");
  return lines.join("\n") + "\n";
}

// ---------------------------- IMPORT ----------------------------

interface ImportSpec {
  key: string;
  pins: [string, string];
  params: (token?: string) => Params;
}

const IMPORTS: Record<string, ImportSpec> = {
  R: { key: "resistor", pins: ["a", "b"], params: (v) => ({ resistance: spiceNum(v) || 1000 }) },
  C: { key: "capacitor", pins: ["a", "b"], params: (v) => ({ capacitance: spiceNum(v) || 1e-7 }) },
  L: { key: "inductor", pins: ["a", "b"], params: (v) => ({ inductance: spiceNum(v) || 1e-5 }) },
  V: { key: "dc_supply", pins: ["+", "-"], params: (v) => ({ voltage: spiceNum(v) || 5 }) },
  D: { key: "led", pins: ["anode", "cathode"], params: () => ({}) },
};

function grid(index: number): Position {
  return { x: 60 + ((index - 1) % 6) * 150, y: 60 + Math.floor((index - 1) / 6) * 120 };
}

// Parse a SPICE deck into a Circuit. Each distinct node becomes a net; node 0/gnd gets
// a ground part. Supported cards: R, C, L, V, D. Unknown cards and dot-commands are skipped.
export function parseSpice(text: string): Circuit {
  const instances: ComponentInstance[] = [];
  const nodeEndpoints = new Map<string, string[]>();
  let count = 0;
  const addPin = (node: string, id: string, pin: string) => {
    const key = node.toLowerCase() === "gnd" ? "0" : node;
    const list = nodeEndpoints.get(key) ?? [];
    list.push(`${id}:${pin}`);
    nodeEndpoints.set(key, list);
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("*") || line.startsWith(".")) continue;
    const tokens = line.split(/\s+/);
    if (tokens.length < 3) continue;
    const spec = IMPORTS[tokens[0][0].toUpperCase()];
    if (!spec) continue;
    const id = `p${++count}`;
    const valueTok = tokens.slice(3).find((tok) => /^[-+]?\d/.test(tok));
    instances.push({
      id,
      component_key: spec.key,
      label: tokens[0],
      position: grid(count),
      params: spec.params(valueTok),
    });
    addPin(tokens[1], id, spec.pins[0]);
    addPin(tokens[2], id, spec.pins[1]);
  }

  const nets: Net[] = [];
  let grounds = 0;
  let ni = 0;
  for (const [node, endpoints] of nodeEndpoints) {
    const eps = [...endpoints];
    if (node === "0") {
      const gid = `gnd${++grounds}`;
      instances.push({ id: gid, component_key: "ground", label: "GND", position: grid(count + grounds), params: {} });
      eps.push(`${gid}:gnd`);
    }
    nets.push({ id: `n${++ni}`, name: node, endpoints: eps });
  }

  return { instances, nets };
}
