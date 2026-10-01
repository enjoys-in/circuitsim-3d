import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Circuit, SimulationOptions, SimulationOutput } from "../../domain";
import { errorMessage, isAbort, simulationService } from "../../services";
import { LIVE_DEBOUNCE_MS } from "../../shared/constants";
import { useDebouncedEffect } from "../../shared/hooks/useDebouncedEffect";
import type { RunStatus } from "./SimulationContext";

export const DEFAULT_OPTIONS: SimulationOptions = {
  analysis: "op",
  t_stop: 0.01,
  steps: 200,
  ticks: 20,
  tick_ms: 500,
};

export function useSimulationRunner(circuit: Circuit, circuitKey: string) {
  const [options, setOptionsState] = useState<SimulationOptions>(DEFAULT_OPTIONS);
  const [live, setLive] = useState(true);
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [ranKey, setRanKey] = useState<string | null>(null);
  const circuitRef = useRef(circuit);
  const keyRef = useRef(circuitKey);
  const optionsRef = useRef(options);
  const controllerRef = useRef<AbortController | null>(null);
  circuitRef.current = circuit;
  keyRef.current = circuitKey;
  optionsRef.current = options;

  const run = useCallback(async () => {
    controllerRef.current?.abort();
    const current = circuitRef.current;
    const key = keyRef.current;
    if (current.instances.length === 0) {
      setResult(null);
      setError(null);
      setStatus("idle");
      setRanKey(key);
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("running");
    try {
      const response = await simulationService.run(current, optionsRef.current, { signal: controller.signal });
      setResult(response.results);
      setError(null);
      setStatus("success");
    } catch (err) {
      if (isAbort(err)) return;
      setError(errorMessage(err, "Simulation failed"));
      setStatus("error");
    } finally {
      if (controllerRef.current === controller) setRanKey(key);
    }
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useDebouncedEffect(() => void run(), LIVE_DEBOUNCE_MS, [circuitKey, options], live);

  const setOptions = useCallback(
    (patch: Partial<SimulationOptions>) => setOptionsState((prev) => ({ ...prev, ...patch })),
    [],
  );

  const trigger = useCallback(() => void run(), [run]);
  const stale = ranKey !== null && ranKey !== circuitKey;

  return useMemo(
    () => ({ result, error, status, stale, options, setOptions, live, setLive, run: trigger }),
    [result, error, status, stale, options, setOptions, live, trigger],
  );
}
