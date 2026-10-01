import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { ComponentDef } from "../../domain";
import { usePersistentState } from "../../shared/hooks/usePersistentState";

interface CustomComponentsValue {
  components: ComponentDef[];
  addComponent: (def: ComponentDef) => void;
  removeComponent: (key: string) => void;
}

const CustomComponentsContext = createContext<CustomComponentsValue | null>(null);
const STORAGE_KEY = "circuitsim.customparts";

export function CustomComponentsProvider({ children }: { children: ReactNode }) {
  const [components, setComponents] = usePersistentState<ComponentDef[]>(STORAGE_KEY, []);

  const addComponent = useCallback(
    (def: ComponentDef) => setComponents((prev) => [...prev.filter((c) => c.key !== def.key), def]),
    [setComponents],
  );

  const removeComponent = useCallback(
    (key: string) => setComponents((prev) => prev.filter((c) => c.key !== key)),
    [setComponents],
  );

  const value = useMemo(
    () => ({ components, addComponent, removeComponent }),
    [components, addComponent, removeComponent],
  );

  return <CustomComponentsContext.Provider value={value}>{children}</CustomComponentsContext.Provider>;
}

export function useCustomComponents(): CustomComponentsValue {
  const value = useContext(CustomComponentsContext);
  if (!value) throw new Error("useCustomComponents must be used inside <CustomComponentsProvider>");
  return value;
}
