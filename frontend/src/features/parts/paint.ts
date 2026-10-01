export const LED_COLORS: Record<string, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#facc15",
  orange: "#f97316",
  white: "#f1f5f9",
};

export const PCB_COLORS = ["green", "blue", "teal", "purple", "black", "red"] as const;
export type PcbColor = (typeof PCB_COLORS)[number];

const url = (id: string) => `url(#cs-${id})`;

export const paint = {
  metal: url("metal"),
  gold: url("gold"),
  chip: url("chip"),
  plastic: url("plastic"),
  whitePlastic: url("white-plastic"),
  resistor: url("resistor"),
  ceramic: url("ceramic"),
  electrolytic: url("electrolytic"),
  copper: url("copper"),
  glass: url("glass"),
  pcb: (color: PcbColor) => url(`pcb-${color}`),
  led: (color: string) => url(`led-${LED_COLORS[color] ? color : "red"}`),
  shadow: url("shadow"),
  glow: url("glow"),
};

export function ledColor(params: Record<string, unknown>): string {
  const color = String(params.color ?? "red").toLowerCase();
  return LED_COLORS[color] ? color : "red";
}
