import { useEffect, useRef, type DependencyList } from "react";

export function useDebouncedEffect(effect: () => void, delay: number, deps: DependencyList, enabled = true): void {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    if (!enabled) return;
    const handle = window.setTimeout(() => effectRef.current(), delay);
    return () => window.clearTimeout(handle);
  }, [enabled, delay, ...deps]);
}
