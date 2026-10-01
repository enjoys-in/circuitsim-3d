import { EXAMPLES, type Example } from "./examples";

export type Level = "Simple" | "Intermediate" | "Complex";

export const LEVELS: Level[] = ["Simple", "Intermediate", "Complex"];

export const LEVEL_BLURB: Record<Level, string> = {
  Simple: "First circuits — gates, LEDs, switches, basic analog and blink sketches",
  Intermediate: "Building blocks — ALU, registers, counters, memory, adders and multiplexers",
  Complex: "Whole datapaths — a running accumulator CPU wired from the blocks above",
};

const COMPLEX_IDS = new Set(["accumulator-cpu", "datapath", "cpu4", "cpu8"]);

const INTERMEDIATE_IDS = new Set([
  "reg4-store",
  "alu-accumulator",
  "pc-rom",
  "alu-4bit",
  "sync-counter",
  "full-adder",
  "nand-latch",
  "ripple-counter",
  "mux-demo",
  "buck-supply",
  "lipo-charger",
  "ina219-monitor",
  "esp32-thermostat",
  "esp32-oled-weather",
  "esp32-servo-sweep",
]);

function levelOf(example: Example): Level {
  if (COMPLEX_IDS.has(example.id) || example.id.includes("cpu")) return "Complex";
  if (INTERMEDIATE_IDS.has(example.id)) return "Intermediate";
  return "Simple";
}

export interface LevelGroup {
  level: Level;
  blurb: string;
  items: Example[];
}

export const LEVEL_GROUPS: LevelGroup[] = LEVELS.map((level) => ({
  level,
  blurb: LEVEL_BLURB[level],
  items: EXAMPLES.filter((example) => levelOf(example) === level),
})).filter((group) => group.items.length > 0);
