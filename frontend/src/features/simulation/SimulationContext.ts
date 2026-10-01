import { createContext, useContext } from "react";
import type { InstanceState, NetValues, SimulationOptions, SimulationOutput } from "../../domain";

export type RunStatus = "idle" | "running" | "success" | "error";

export interface Playback {
  frame: number;
  frameCount: number;
  playing: boolean;
  setFrame: (frame: number) => void;
  toggle: () => void;
}

export interface SimulationValue {
  result: SimulationOutput | null;
  error: string | null;
  status: RunStatus;
  stale: boolean;
  options: SimulationOptions;
  setOptions: (patch: Partial<SimulationOptions>) => void;
  live: boolean;
  setLive: (live: boolean) => void;
  run: () => void;
  playback: Playback;
}

export interface LiveState {
  engine: string | null;
  nets: NetValues;
  instances: Record<string, InstanceState>;
}

export const SimulationContext = createContext<SimulationValue | null>(null);
export const LiveStateContext = createContext<LiveState>({ engine: null, nets: {}, instances: {} });

export function useSimulation(): SimulationValue {
  const value = useContext(SimulationContext);
  if (!value) throw new Error("useSimulation must be used inside <SimulationProvider>");
  return value;
}

export function useLiveState(): LiveState {
  return useContext(LiveStateContext);
}

export function useLiveInstance(id: string): InstanceState | undefined {
  return useContext(LiveStateContext).instances[id];
}

export function useLiveNet(id: string): { engine: string | null; value: number | null | undefined } {
  const { engine, nets } = useContext(LiveStateContext);
  return { engine, value: nets[id] };
}
