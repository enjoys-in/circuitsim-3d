import type { ReactNode } from "react";
import { useCatalog } from "../catalog/CatalogContext";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { PcbContext } from "./PcbContext";
import { usePcbState } from "./usePcbState";

export function PcbProvider({ children }: { children: ReactNode }) {
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();
  const state = usePcbState(circuit, byKey);
  return <PcbContext.Provider value={state}>{children}</PcbContext.Provider>;
}
