import { cx } from "../../shared/lib/format";
import { useCatalog } from "../catalog/CatalogContext";
import { COMMON_PARTS } from "./commonParts";
import { PresetItem } from "./PresetItem";

interface Props {
  open: boolean;
  query: string;
  onToggle: () => void;
}

export function CommonPartsGroup({ open, query, onToggle }: Props) {
  const { byKey } = useCatalog();
  const needle = query.trim().toLowerCase();
  const items = COMMON_PARTS.filter((part) => {
    const base = byKey.get(part.baseKey);
    if (!base) return false;
    if (!needle) return true;
    return (
      part.name.toLowerCase().includes(needle) ||
      base.name.toLowerCase().includes(needle) ||
      (base.subcategory ?? "").toLowerCase().includes(needle) ||
      base.tags.some((tag) => tag.toLowerCase().includes(needle))
    );
  });
  if (items.length === 0) return null;

  return (
    <section className="palette-group">
      <button type="button" className="palette-group__header" aria-expanded={open} onClick={onToggle}>
        <span className={cx("palette-group__chevron", open && "palette-group__chevron--open")} aria-hidden>
          ▶
        </span>
        <span className="palette-group__title">Common parts</span>
        <span className="palette-group__count">{items.length}</span>
      </button>
      {open && (
        <div className="palette__grid" role="list">
          {items.map((preset) => (
            <PresetItem key={preset.id} preset={preset} base={byKey.get(preset.baseKey)!} />
          ))}
        </div>
      )}
    </section>
  );
}
