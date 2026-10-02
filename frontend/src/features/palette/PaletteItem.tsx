import { lazy, memo, Suspense, type DragEvent } from "react";
import type { ComponentDef } from "../../domain";
import { DRAG_MIME } from "../../shared/constants";
import { useInView } from "../../shared/hooks/useInView";
import { Skeleton } from "../../shared/ui/Skeleton";

const PartThumbnail = lazy(() => import("../parts/PartThumbnail"));

interface Props {
  component: ComponentDef;
}

function PaletteItemImpl({ component }: Props) {
  // Only build the (potentially heavy) SVG thumbnail once the tile is near the viewport.
  const [ref, inView] = useInView<HTMLDivElement>();
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(DRAG_MIME, component.key);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      ref={ref}
      className="palette-item"
      draggable
      onDragStart={handleDragStart}
      title={component.description || component.name}
      role="listitem"
    >
      <div className="palette-item__thumb">
        {inView ? (
          <Suspense fallback={<Skeleton width={52} height={52} radius={8} />}>
            <PartThumbnail def={component} />
          </Suspense>
        ) : (
          <Skeleton width={52} height={52} radius={8} />
        )}
      </div>
      <span className="palette-item__name">{component.name}</span>
    </div>
  );
}

export const PaletteItem = memo(PaletteItemImpl);
