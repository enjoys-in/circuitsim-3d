import type { ComponentCategory, ComponentDef } from "../../domain";

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  dev_board: "Dev boards",
  sensor: "Sensors",
  passive: "Passives",
  semiconductor: "Semiconductors",
  power: "Power",
  actuator: "Actuators",
  logic: "Logic",
  connector: "Connectors",
  pcb: "Boards",
};

const ORDER = Object.keys(CATEGORY_LABELS) as ComponentCategory[];

export interface ComponentGroup {
  category: ComponentCategory;
  label: string;
  items: ComponentDef[];
}

export function groupComponents(components: ComponentDef[], query: string): ComponentGroup[] {
  const needle = query.trim().toLowerCase();
  const matches = (c: ComponentDef) =>
    !needle ||
    c.name.toLowerCase().includes(needle) ||
    c.key.includes(needle) ||
    c.tags.some((t) => t.includes(needle)) ||
    (c.subcategory ?? "").includes(needle);

  const groups = new Map<ComponentCategory, ComponentDef[]>();
  for (const component of components.filter(matches)) {
    const list = groups.get(component.category) ?? [];
    list.push(component);
    groups.set(component.category, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .map(([category, items]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
