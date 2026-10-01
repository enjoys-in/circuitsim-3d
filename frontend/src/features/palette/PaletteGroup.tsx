import type { ComponentDef } from "../../domain";
import { cx } from "../../shared/lib/format";
import { PaletteItem } from "./PaletteItem";

interface Props {
  label: string;
  items: ComponentDef[];
  open: boolean;
  onToggle: () => void;
}

export function PaletteGroup({ label, items, open, onToggle }: Props) {
  return (
    <section className="palette-group">
      <button
        type="button"
        className="palette-group__header"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={cx("palette-group__chevron", open && "palette-group__chevron--open")} aria-hidden>
          ▶
        </span>
        <span className="palette-group__title">{label}</span>
        <span className="palette-group__count">{items.length}</span>
      </button>
      {open && (
        <div className="palette__grid" role="list">
          {items.map((component) => (
            <PaletteItem key={component.key} component={component} />
          ))}
        </div>
      )}
    </section>
  );
}
