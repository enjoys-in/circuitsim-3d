import type { Circuit, ComponentDef, Params } from "../../domain";

export interface BomRow {
  key: string;
  name: string;
  category: string;
  qty: number;
  refs: string[];
  value: string;
}

const SKIP_PARAMS = new Set(["firmware"]);

function paramSummary(params: Params): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (SKIP_PARAMS.has(k) || v === null || v === undefined || v === "") continue;
    if (typeof v === "object") continue;
    const text = String(v);
    if (text.length > 40) continue;
    parts.push(`${k}=${text}`);
  }
  return parts.join(" ");
}

export function buildBom(circuit: Circuit, byKey: ReadonlyMap<string, ComponentDef>): BomRow[] {
  const groups = new Map<string, BomRow>();
  for (const inst of circuit.instances) {
    if (inst.component_key === "ground") continue;
    const def = byKey.get(inst.component_key);
    const value = paramSummary(inst.params);
    const groupKey = `${inst.component_key}|${value}`;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.qty += 1;
      existing.refs.push(inst.label || inst.id);
    } else {
      groups.set(groupKey, {
        key: inst.component_key,
        name: def?.name ?? inst.component_key,
        category: def?.category ?? "",
        qty: 1,
        refs: [inst.label || inst.id],
        value,
      });
    }
  }
  for (const row of groups.values()) row.refs.sort();
  return [...groups.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function bomToCsv(rows: BomRow[]): string {
  const lines = [["Qty", "Part", "Value", "Category", "References"].join(",")];
  for (const r of rows) {
    lines.push([String(r.qty), r.name, r.value, r.category, r.refs.join(" ")].map(csvCell).join(","));
  }
  return lines.join("\n");
}

// Union-find the circuit's net endpoints into electrical nodes (mirrors the backend).
export function buildNetlist(circuit: Circuit): string {
  const parent: Record<string, string> = {};
  const find = (x: string): string => {
    parent[x] ??= x;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]] ?? parent[x];
      x = parent[x];
    }
    return x;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (const net of circuit.nets) {
    const [first, ...rest] = net.endpoints;
    if (!first) continue;
    find(first);
    for (const point of rest) union(first, point);
  }

  const groups = new Map<string, string[]>();
  for (const point of Object.keys(parent)) {
    const root = find(point);
    const list = groups.get(root) ?? [];
    list.push(point);
    groups.set(root, list);
  }

  const nodes = [...groups.values()].filter((g) => g.length > 1).map((g) => g.sort());
  const lines = [`# CircuitSim netlist`, `# ${nodes.length} nodes`, ""];
  nodes.forEach((points, i) => {
    lines.push(`N${i + 1}\t${points.join("  ")}`);
  });
  return lines.join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
