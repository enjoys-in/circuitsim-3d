import { lazy, Suspense, useState, type DragEvent } from "react";
import { DRAG_MIME } from "../../shared/constants";
import { cx } from "../../shared/lib/format";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useCustomComponents } from "./CustomComponentsContext";
import { CustomPartDialog } from "./CustomPartDialog";
import "./custom.css";

const PartThumbnail = lazy(() => import("../parts/PartThumbnail"));

interface Props {
  open: boolean;
  onToggle: () => void;
}

export function CustomComponentsSection({ open, onToggle }: Props) {
  const { components, removeComponent } = useCustomComponents();
  const [dialog, setDialog] = useState(false);

  return (
    <section className="palette-group">
      <button type="button" className="palette-group__header" aria-expanded={open} onClick={onToggle}>
        <span className={cx("palette-group__chevron", open && "palette-group__chevron--open")} aria-hidden>
          ▶
        </span>
        <span className="palette-group__title">My Components</span>
        <span className="palette-group__count">{components.length}</span>
      </button>
      {open && (
        <div className="palette__grid" role="list">
          <button type="button" className="palette-create" onClick={() => setDialog(true)}>
            <span className="palette-create__plus">＋</span>
            <span>New part</span>
          </button>
          {components.map((def) => (
            <div
              key={def.key}
              className="palette-item palette-item--preset"
              draggable
              onDragStart={(e: DragEvent<HTMLDivElement>) => {
                e.dataTransfer.setData(DRAG_MIME, def.key);
                e.dataTransfer.effectAllowed = "copy";
              }}
              title={def.name}
              role="listitem"
            >
              <button
                type="button"
                className="palette-item__remove"
                aria-label={`Delete ${def.name}`}
                draggable={false}
                onClick={() => removeComponent(def.key)}
              >
                ×
              </button>
              <div className="palette-item__thumb">
                <Suspense fallback={<Skeleton width={52} height={52} radius={8} />}>
                  <PartThumbnail def={def} />
                </Suspense>
              </div>
              <span className="palette-item__name">{def.name}</span>
            </div>
          ))}
        </div>
      )}
      <CustomPartDialog open={dialog} onClose={() => setDialog(false)} />
    </section>
  );
}
