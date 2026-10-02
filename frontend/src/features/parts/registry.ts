import type { ComponentDef } from "../../domain";
import { actuatorParts } from "./library/actuators";
import { audioParts } from "./library/audio";
import { axialParts } from "./library/axial";
import { boardParts, devBoard } from "./library/boards";
import { breadboardParts } from "./library/breadboard";
import { connectorParts } from "./library/connectors";
import { logicParts } from "./library/logic";
import { meterParts } from "./library/meters";
import { moduleFactory } from "./library/modules";
import { powerParts } from "./library/power";
import { radialParts } from "./library/radial";
import { semiconductorParts } from "./library/semis";
import { sensorParts } from "./library/sensors";
import { switchParts } from "./library/switches";
import type { PartFactory, PartSpec } from "./types";

const FACTORIES: Record<string, PartFactory> = {
  ...axialParts,
  ...radialParts,
  ...semiconductorParts,
  ...logicParts,
  ...powerParts,
  ...sensorParts,
  ...actuatorParts,
  ...switchParts,
  ...audioParts,
  ...boardParts,
  ...breadboardParts,
  ...connectorParts,
  ...meterParts,
};

function fallback(def: ComponentDef): PartFactory {
  if (def.category === "dev_board") return devBoard;
  if (def.key.startsWith("custom_")) {
    const names = def.pins.map((p) => p.name);
    const outputs = def.pins.filter((p) => p.direction === "output").map((p) => p.name);
    // Mixed in/out -> inputs left, outputs right; otherwise split evenly so 2-pin parts balance.
    const leftPins =
      outputs.length > 0 && outputs.length < names.length
        ? names.filter((n) => !outputs.includes(n))
        : names.slice(0, Math.ceil(names.length / 2));
    return moduleFactory({
      color: "teal",
      title: def.name.slice(0, 16).toUpperCase(),
      leftPins: leftPins.length > 0 ? leftPins : undefined,
    });
  }
  return moduleFactory({ color: "blue", title: def.name.slice(0, 16).toUpperCase() });
}

const cache = new Map<string, PartSpec>();

export function getPart(def: ComponentDef): PartSpec {
  const cacheKey = `${def.key}:${def.pins.map((p) => p.name).join(",")}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const spec = (FACTORIES[def.key] ?? fallback(def))(def);
  cache.set(cacheKey, spec);
  return spec;
}
