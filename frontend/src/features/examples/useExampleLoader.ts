import { useCallback } from "react";
import { useCircuitActions } from "../board/CircuitGraphContext";
import { useSimulation } from "../simulation/SimulationContext";
import { DEFAULT_OPTIONS } from "../simulation/useSimulationRunner";
import { EXAMPLES } from "./examples";

export function useExampleLoader() {
  const { loadCircuit } = useCircuitActions();
  const { setOptions } = useSimulation();

  return useCallback(
    (id: string) => {
      const example = EXAMPLES.find((e) => e.id === id);
      if (!example) return;
      setOptions({ ...DEFAULT_OPTIONS, ...example.options });
      loadCircuit(example.circuit);
    },
    [loadCircuit, setOptions],
  );
}
