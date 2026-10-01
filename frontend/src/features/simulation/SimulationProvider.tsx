import { useMemo, type ReactNode } from "react";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { LiveStateContext, SimulationContext, type LiveState, type SimulationValue } from "./SimulationContext";
import { usePlayback } from "./usePlayback";
import { useSimulationRunner } from "./useSimulationRunner";

const EMPTY_LIVE: LiveState = { engine: null, nets: {}, instances: {} };

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { circuit, circuitKey } = useCircuitGraph();
  const runner = useSimulationRunner(circuit, circuitKey);
  const playback = usePlayback(runner.result);
  const { result } = runner;

  const live = useMemo<LiveState>(() => {
    if (!result) return EMPTY_LIVE;
    const frame = result.frames[playback.frame];
    return {
      engine: result.engine,
      nets: frame?.nets ?? result.nets,
      instances: frame?.instances ?? result.instances,
    };
  }, [result, playback.frame]);

  const value = useMemo<SimulationValue>(() => ({ ...runner, playback }), [runner, playback]);

  return (
    <SimulationContext.Provider value={value}>
      <LiveStateContext.Provider value={live}>{children}</LiveStateContext.Provider>
    </SimulationContext.Provider>
  );
}
