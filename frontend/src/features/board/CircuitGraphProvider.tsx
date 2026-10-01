import type { ReactNode } from "react";
import { useCatalog } from "../catalog/CatalogContext";
import { CircuitActionsContext, CircuitGraphContext } from "./CircuitGraphContext";
import { useCircuitGraphState } from "./useCircuitGraphState";

export function CircuitGraphProvider({ children }: { children: ReactNode }) {
  const { byKey } = useCatalog();
  const { graph, actions } = useCircuitGraphState(byKey);
  return (
    <CircuitActionsContext.Provider value={actions}>
      <CircuitGraphContext.Provider value={graph}>{children}</CircuitGraphContext.Provider>
    </CircuitActionsContext.Provider>
  );
}
