import { useMemo, type ReactNode } from "react";
import { catalogService } from "../../services";
import { useAsync } from "../../shared/hooks/useAsync";
import { useCustomComponents } from "../custom/CustomComponentsContext";
import { CatalogContext, type CatalogValue } from "./CatalogContext";

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { data, status, error, reload } = useAsync((signal) => catalogService.list({ signal }));
  const { components: custom } = useCustomComponents();

  const value = useMemo<CatalogValue>(() => {
    const components = data ?? [];
    return {
      components,
      // Custom parts resolve for drag/wire/render but stay out of the catalog groups.
      byKey: new Map([...components, ...custom].map((c) => [c.key, c])),
      status,
      error,
      reload,
    };
  }, [data, custom, status, error, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
