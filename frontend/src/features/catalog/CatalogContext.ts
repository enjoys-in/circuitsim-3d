import { createContext, useContext } from "react";
import type { ComponentDef } from "../../domain";
import type { AsyncStatus } from "../../shared/hooks/useAsync";

export interface CatalogValue {
  components: ComponentDef[];
  byKey: ReadonlyMap<string, ComponentDef>;
  status: AsyncStatus;
  error: Error | null;
  reload: () => void;
}

export const CatalogContext = createContext<CatalogValue | null>(null);

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return value;
}
