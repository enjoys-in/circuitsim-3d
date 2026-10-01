import { useMemo, type ReactNode } from "react";
import { catalogService } from "../../services";
import { useAsync } from "../../shared/hooks/useAsync";
import { CatalogContext, type CatalogValue } from "./CatalogContext";

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { data, status, error, reload } = useAsync((signal) => catalogService.list({ signal }));

  const value = useMemo<CatalogValue>(() => {
    const components = data ?? [];
    return {
      components,
      byKey: new Map(components.map((c) => [c.key, c])),
      status,
      error,
      reload,
    };
  }, [data, status, error, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
