import { ANALOG_EXAMPLES } from "./analog";
import type { Example, ExampleCategory } from "./build";
import { COMPUTING_EXAMPLES } from "./computing";
import { DIGITAL_EXAMPLES } from "./digital";
import { MCU_EXAMPLES } from "./mcu";
import { POWER_EXAMPLES } from "./power";

export type { Example, ExampleCategory } from "./build";

export const EXAMPLES: Example[] = [
  ...ANALOG_EXAMPLES,
  ...POWER_EXAMPLES,
  ...DIGITAL_EXAMPLES,
  ...COMPUTING_EXAMPLES,
  ...MCU_EXAMPLES,
];

const ORDER: ExampleCategory[] = ["Analog", "Power", "Digital", "MCU"];

export interface ExampleGroup {
  category: ExampleCategory;
  items: Example[];
}

export const EXAMPLE_GROUPS: ExampleGroup[] = ORDER.map((category) => ({
  category,
  items: EXAMPLES.filter((example) => example.category === category),
}));

export const FEATURED_EXAMPLES: Example[] = [
  EXAMPLES.find((e) => e.id === "led-button"),
  EXAMPLES.find((e) => e.id === "esp32-thermostat"),
  EXAMPLES.find((e) => e.id === "ripple-counter"),
  EXAMPLES.find((e) => e.id === "rc-charge"),
].filter((e): e is Example => e !== undefined);
