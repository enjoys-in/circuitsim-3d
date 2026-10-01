import { lazy, memo, Suspense, type DragEvent } from "react";
import type { ComponentDef } from "../../domain";
import { DRAG_MIME } from "../../shared/constants";
import { Skeleton } from "../../shared/ui/Skeleton";

const PartThumbnail = lazy(() => import("../parts/PartThumbnail"));

interface Props {
  component: ComponentDef;
}

function PaletteItemImpl({ component }: Props) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(DRAG_MIME, component.key);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      className="palette-item"
      draggable
      onDragStart={handleDragStart}
      title={component.description || component.name}
      role="listitem"
    >
      <div className="palette-item__thumb">
        <Suspense fallback={<Skeleton width={52} height={52} radius={8} />}>
          <PartThumbnail def={component} />
        </Suspense>
      </div>
      <span className="palette-item__name">{component.name}</span>
    </div>
  );
}

export const PaletteItem = memo(PaletteItemImpl);
