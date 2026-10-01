import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Params } from "../../domain";
import { usePersistentState } from "../../shared/hooks/usePersistentState";

export interface PartPreset {
  id: string;
  name: string;
  baseKey: string;
  params: Params;
}

interface PresetsValue {
  presets: PartPreset[];
  addPreset: (preset: Omit<PartPreset, "id">) => void;
  removePreset: (id: string) => void;
}

const PresetsContext = createContext<PresetsValue | null>(null);
const STORAGE_KEY = "circuitsim.myparts";

const uid = () => `mp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function PresetsProvider({ children }: { children: ReactNode }) {
  const [presets, setPresets] = usePersistentState<PartPreset[]>(STORAGE_KEY, []);

  const addPreset = useCallback(
    (preset: Omit<PartPreset, "id">) => {
      setPresets((prev) => [...prev, { ...preset, id: uid() }]);
    },
    [setPresets],
  );

  const removePreset = useCallback(
    (id: string) => {
      setPresets((prev) => prev.filter((p) => p.id !== id));
    },
    [setPresets],
  );

  const value = useMemo(
    () => ({ presets, addPreset, removePreset }),
    [presets, addPreset, removePreset],
  );

  return <PresetsContext.Provider value={value}>{children}</PresetsContext.Provider>;
}

export function usePresets(): PresetsValue {
  const value = useContext(PresetsContext);
  if (!value) throw new Error("usePresets must be used inside <PresetsProvider>");
  return value;
}
