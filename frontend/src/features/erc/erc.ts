import type { Circuit, ComponentDef } from "../../domain";

export type ErcSeverity = "error" | "warning";

export interface ErcIssue {
  id: string;
  severity: ErcSeverity;
  message: string;
}

const SOURCE_KEYS = new Set(["dc_supply", "battery_lipo", "tp4056_charger"]);
// Parts whose presence implies an analog network that needs a 0 V reference.
const NEEDS_GROUND = new Set([
  "resistor",
  "capacitor",
  "electrolytic_cap",
  "inductor",
  "led",
  "diode",
  "zener",
  "voltmeter",
  "ammeter",
]);

// Static electrical rule check over the schematic: floating pins, missing ground,
// and nets driven by more than one output/source.
export function runErc(circuit: Circuit, catalog: ReadonlyMap<string, ComponentDef>): ErcIssue[] {
  const issues: ErcIssue[] = [];
  const instById = new Map(circuit.instances.map((i) => [i.id, i]));

  const connected = new Set<string>();
  for (const net of circuit.nets) {
    if (net.endpoints.length >= 2) for (const ep of net.endpoints) connected.add(ep);
  }

  for (const inst of circuit.instances) {
    const def = catalog.get(inst.component_key);
    if (!def || inst.component_key === "ground") continue;
    for (const pin of def.pins) {
      if (!connected.has(`${inst.id}:${pin.name}`)) {
        const power = pin.direction === "power" || pin.direction === "ground";
        issues.push({
          id: `float:${inst.id}:${pin.name}`,
          severity: power ? "error" : "warning",
          message: `${inst.label || inst.id}.${pin.name} (${pin.direction}) is unconnected`,
        });
      }
    }
  }

  const hasGround = circuit.instances.some((i) => i.component_key === "ground");
  const needsGround = circuit.instances.some((i) => NEEDS_GROUND.has(i.component_key));
  const hasSource = circuit.instances.some((i) => SOURCE_KEYS.has(i.component_key));
  if (hasSource && needsGround && !hasGround) {
    issues.push({
      id: "no-ground",
      severity: "error",
      message: "No ground reference — add a Ground part so the analog solver has a 0 V node",
    });
  }

  for (const net of circuit.nets) {
    if (net.endpoints.length < 2) continue;
    const drivers: string[] = [];
    for (const ep of net.endpoints) {
      const [iid, pinName] = ep.split(":");
      const inst = instById.get(iid);
      const def = inst && catalog.get(inst.component_key);
      if (!inst || !def) continue;
      const pin = def.pins.find((p) => p.name === pinName);
      const isSourcePower = SOURCE_KEYS.has(inst.component_key) && pin?.direction === "power";
      if (pin?.direction === "output" || isSourcePower) drivers.push(`${inst.label || iid}.${pinName}`);
    }
    if (drivers.length > 1) {
      issues.push({
        id: `drivers:${net.id}`,
        severity: "error",
        message: `Net has ${drivers.length} drivers (short): ${drivers.join(", ")}`,
      });
    }
  }

  return issues;
}
