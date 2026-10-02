import type { Series } from "../../../domain";

export interface Bus {
  base: string;
  members: Series[]; // ordered LSB -> MSB (bit 0 first)
  values: (number | null)[]; // combined integer per time step
}

export interface BusGrouping {
  buses: Bus[];
  singles: Series[];
}

// Group 1-bit digital signals whose labels share a base and a trailing index
// (D0,D1,D2… or pc0,pc1…) into a bus whose value is the combined integer per step.
// Signals that don't belong to a >=2-member group are returned as singles.
export function groupBuses(series: Series[]): BusGrouping {
  const byBase = new Map<string, { idx: number; s: Series }[]>();
  const order: string[] = [];
  for (const s of series) {
    const match = /^(.*?)(\d+)$/.exec(s.label.trim());
    if (!match) continue;
    const base = match[1].replace(/[_\s.]+$/, "");
    if (!base) continue;
    if (!byBase.has(base)) {
      byBase.set(base, []);
      order.push(base);
    }
    byBase.get(base)!.push({ idx: Number(match[2]), s });
  }

  const buses: Bus[] = [];
  const used = new Set<string>();
  for (const base of order) {
    const members = byBase.get(base)!;
    if (members.length < 2) continue;
    members.sort((a, b) => a.idx - b.idx);
    const ordered = members.map((m) => m.s);
    const len = Math.max(...ordered.map((s) => s.values.length));
    const values: (number | null)[] = [];
    for (let t = 0; t < len; t++) {
      let v = 0;
      let anyNull = false;
      ordered.forEach((s, bit) => {
        const x = s.values[t];
        if (x === null || x === undefined) anyNull = true;
        else if (x) v |= 1 << bit;
      });
      values.push(anyNull ? null : v);
    }
    buses.push({ base, members: ordered, values });
    for (const s of ordered) used.add(s.id);
  }

  const singles = series.filter((s) => !used.has(s.id));
  return { buses, singles };
}
