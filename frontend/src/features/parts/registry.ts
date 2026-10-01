import type { ComponentDef } from "../../domain";
import { actuatorParts } from "./library/actuators";
import { audioParts } from "./library/audio";
import { axialParts } from "./library/axial";
import { boardParts, devBoard } from "./library/boards";
import { breadboardParts } from "./library/breadboard";
import { logicParts } from "./library/logic";
import { moduleFactory } from "./library/modules";
import { powerParts } from "./library/power";
import { radialParts } from "./library/radial";
import { semiconductorParts } from "./library/semis";
import { sensorParts } from "./library/sensors";
import type { PartFactory, PartSpec } from "./types";

const FACTORIES: Record<string, PartFactory> = {
  ...axialParts,
  ...radialParts,
  ...semiconductorParts,
  ...logicParts,
  ...powerParts,
  ...sensorParts,
  ...actuatorParts,
  ...audioParts,
  ...boardParts,
  ...breadboardParts,
};

function fallback(def: ComponentDef): PartFactory {
  if (def.category === "dev_board") return devBoard;
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
