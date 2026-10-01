import { lazy, Suspense, type DragEvent } from "react";
import type { ComponentDef } from "../../domain";
import { DRAG_MIME, PRESET_MIME } from "../../shared/constants";
import { Skeleton } from "../../shared/ui/Skeleton";
import type { PartPreset } from "./PresetsContext";

const PartThumbnail = lazy(() => import("../parts/PartThumbnail"));

interface Props {
  preset: PartPreset;
  base: ComponentDef;
  onRemove?: () => void;
}

export function PresetItem({ preset, base, onRemove }: Props) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(DRAG_MIME, preset.baseKey);
    event.dataTransfer.setData(PRESET_MIME, JSON.stringify({ name: preset.name, params: preset.params }));
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      className="palette-item palette-item--preset"
      draggable
      onDragStart={handleDragStart}
      title={`${preset.name} — based on ${base.name}`}
      role="listitem"
    >
      {onRemove && (
        <button
          type="button"
          className="palette-item__remove"
          aria-label={`Delete ${preset.name}`}
          onClick={onRemove}
          draggable={false}
        >
          ×
        </button>
      )}
      <div className="palette-item__thumb">
        <Suspense fallback={<Skeleton width={52} height={52} radius={8} />}>
          <PartThumbnail def={base} params={preset.params} />
        </Suspense>
      </div>
      <span className="palette-item__name">{preset.name}</span>
    </div>
  );
}
