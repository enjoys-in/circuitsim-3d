import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorNotice } from "../../shared/ui/ErrorBoundary";
import { usePersistentState } from "../../shared/hooks/usePersistentState";
import { useCatalog } from "../catalog/CatalogContext";
import { MyPartsGroup } from "../presets/MyPartsGroup";
import { groupComponents } from "./groupComponents";
import { PaletteGroup } from "./PaletteGroup";
import { PaletteSkeleton } from "./PaletteSkeleton";
import "./palette.css";

const STORAGE_KEY = "circuitsim.palette.open";

export function Palette() {
  const { components, status, error, reload } = useCatalog();
  const [query, setQuery] = useState("");
  const [openMap, setOpenMap] = usePersistentState<Record<string, boolean>>(STORAGE_KEY, {});
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery.trim().length > 0;
  const groups = useMemo(() => groupComponents(components, deferredQuery), [components, deferredQuery]);
  const toggle = (category: string) => setOpenMap((prev) => ({ ...prev, [category]: !prev[category] }));

  return (
    <aside className="palette" aria-label="Component library">
      <div className="palette__header">
        <h2 className="panel-heading palette__heading">
          Parts
          {status === "success" && <span className="palette__total">{components.length}</span>}
        </h2>
        <input
          className="palette__search"
          type="search"
          placeholder="Search parts, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {status === "pending" && <PaletteSkeleton />}
      {status === "error" && (
        <ErrorNotice compact title="Catalog unavailable" message={error?.message ?? "Unknown error"} onRetry={reload} />
      )}
      {status === "success" && groups.length === 0 && <EmptyState title="No parts match">Try another search.</EmptyState>}
      {status === "success" && (
        <div className="palette__groups">
          <MyPartsGroup
            open={searching || Boolean(openMap.myparts)}
            onToggle={() => toggle("myparts")}
          />
          {groups.map((group) => (
            <PaletteGroup
              key={group.category}
              label={group.label}
              items={group.items}
              open={searching || Boolean(openMap[group.category])}
              onToggle={() => toggle(group.category)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
