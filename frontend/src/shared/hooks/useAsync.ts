import { useCallback, useEffect, useRef, useState } from "react";
import { isAbort } from "../../services";

export type AsyncStatus = "idle" | "pending" | "success" | "error";

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  status: AsyncStatus;
}

export interface UseAsyncResult<T> extends AsyncState<T> {
  reload: () => void;
}

export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: "pending", error: null }));
    fnRef
      .current(controller.signal)
      .then((data) => setState({ data, error: null, status: "success" }))
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ data: null, error, status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
