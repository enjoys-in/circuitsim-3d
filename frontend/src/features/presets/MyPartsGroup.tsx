import { cx } from "../../shared/lib/format";
import { useCatalog } from "../catalog/CatalogContext";
import { PresetItem } from "./PresetItem";
import { usePresets } from "./PresetsContext";

interface Props {
  open: boolean;
  onToggle: () => void;
}

export function MyPartsGroup({ open, onToggle }: Props) {
  const { presets, removePreset } = usePresets();
  const { byKey } = useCatalog();
  if (presets.length === 0) return null;

  return (
    <section className="palette-group">
      <button type="button" className="palette-group__header" aria-expanded={open} onClick={onToggle}>
        <span className={cx("palette-group__chevron", open && "palette-group__chevron--open")} aria-hidden>
          ▶
        </span>
        <span className="palette-group__title">My Parts</span>
        <span className="palette-group__count">{presets.length}</span>
      </button>
      {open && (
        <div className="palette__grid" role="list">
          {presets.map((preset) => {
            const base = byKey.get(preset.baseKey);
            if (!base) return null;
            return (
              <PresetItem
                key={preset.id}
                preset={preset}
                base={base}
                onRemove={() => removePreset(preset.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
