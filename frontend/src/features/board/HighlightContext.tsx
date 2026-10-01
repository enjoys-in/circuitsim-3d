import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export interface PinRef {
  nodeId: string;
  pin: string;
}

interface HighlightValue {
  pin: PinRef | null;
  highlightPin: (pin: PinRef | null) => void;
}

const HighlightContext = createContext<HighlightValue | null>(null);

// Small, isolated context: clicking a sidebar pin flashes the matching handle on the
// canvas. Kept separate from the graph store so nodes don't re-render every sim frame.
export function HighlightProvider({ children }: { children: ReactNode }) {
  const [pin, setPin] = useState<PinRef | null>(null);
  const timer = useRef<number>();

  const highlightPin = useCallback((next: PinRef | null) => {
    window.clearTimeout(timer.current);
    setPin(next);
    if (next) timer.current = window.setTimeout(() => setPin(null), 2500);
  }, []);

  const value = useMemo(() => ({ pin, highlightPin }), [pin, highlightPin]);
  return <HighlightContext.Provider value={value}>{children}</HighlightContext.Provider>;
}

export function useHighlight(): HighlightValue {
  const value = useContext(HighlightContext);
  if (!value) throw new Error("useHighlight must be used inside <HighlightProvider>");
  return value;
}
