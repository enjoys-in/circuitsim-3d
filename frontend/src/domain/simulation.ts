import type { Circuit } from "./circuit";

export type Analysis = "op" | "tran";

export interface SimulationOptions {
  analysis: Analysis;
  t_stop: number;
  steps: number;
  ticks: number;
  tick_ms: number;
}

export interface SimulationRequest {
  circuit: Circuit;
  engine?: string;
  options: SimulationOptions;
}

export interface InstanceState {
  on?: boolean;
  level?: number;
  burnt?: boolean;
  value?: number | null;
  q?: number;
  current?: number;
  voltage?: number;
  power?: number;
  region?: string;
  readings?: Record<string, number>;
  pins?: Record<string, number>;
  onboard_led?: boolean;
  fault?: string | null;
  angle?: number;
  text?: string;
  lines?: string[];
  coil_voltage?: number;
}

export type NetValues = Record<string, number | null>;

export interface SummaryItem {
  label: string;
  value: number | string | null;
  unit: string;
}

export interface Series {
  id: string;
  label: string;
  unit: string;
  kind: "digital" | "analog";
  values: (number | null)[];
}

export interface Frame {
  nets: NetValues;
  instances: Record<string, InstanceState>;
}

export interface LogEntry {
  t: number;
  source: string;
  text: string;
}

export interface SimulationOutput {
  engine: string;
  analysis: string;
  nets: NetValues;
  instances: Record<string, InstanceState>;
  summary: SummaryItem[];
  time: number[];
  time_unit: "s" | "tick";
  series: Series[];
  frames: Frame[];
  log: LogEntry[];
  warnings: string[];
}

export interface SimulationResult {
  engine: string;
  results: SimulationOutput;
}

export interface VerifyVector {
  inputs: Record<string, number>;
  expected?: Record<string, number> | null;
}

export interface VerifyPort {
  id: string;
  label: string;
}

export interface VerifyRow {
  inputs: Record<string, number>;
  outputs: Record<string, number | null>;
  expected?: Record<string, number> | null;
  passed?: boolean | null;
}

export interface VerifyResponse {
  engine: string;
  inputs: VerifyPort[];
  outputs: VerifyPort[];
  rows: VerifyRow[];
  passed: number;
  failed: number;
  total: number;
}

export interface SweepSeries {
  id: string;
  label: string;
  unit: string;
  values: (number | null)[];
}

export interface SweepResult {
  engine: string;
  x: number[];
  x_label: string;
  x_unit: string;
  series: SweepSeries[];
}
