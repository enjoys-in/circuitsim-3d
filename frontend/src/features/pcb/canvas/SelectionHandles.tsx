import { type PointerEvent } from "react";
import type { ComponentDef } from "../../../domain";
import { getFootprint } from "../model/footprints";
import { rotate } from "../model/geometry";
import type { Placement } from "../model/pcbTypes";

interface Props {
  instanceId: string;
  placement: Placement;
  def: ComponentDef;
  onRotate: () => void;
  onFlip: () => void;
  onResizePointerDown: (e: PointerEvent, instanceId: string) => void;
}

// Floating rotate/flip buttons plus a corner grip to resize the body outline.
export function SelectionHandles({ instanceId, placement, def, onRotate, onFlip, onResizePointerDown }: Props) {
  const footprint = getFootprint(def);
  const bodyW = placement.bodyW ?? footprint.width;
  const bodyH = placement.bodyH ?? footprint.height;
  const rad = (placement.rotation * Math.PI) / 180;
  const halfH = (Math.abs(bodyW * Math.sin(rad)) + Math.abs(bodyH * Math.cos(rad))) / 2;
  const topY = placement.y - halfH - 16;
  const corner = rotate({ x: bodyW / 2, y: bodyH / 2 }, placement.rotation);
  const grip = { x: placement.x + corner.x, y: placement.y + corner.y };

  const stop = (e: PointerEvent) => e.stopPropagation();

  return (
    <g className="fp-handles">
      <HandleButton x={placement.x - 13} y={topY} label="⟳" title="Rotate (R)" onRun={onRotate} onDown={stop} />
      <HandleButton x={placement.x + 13} y={topY} label="⇋" title="Flip (F)" onRun={onFlip} onDown={stop} />
      <rect
        className="fp-resize"
        x={grip.x - 5}
        y={grip.y - 5}
        width={10}
        height={10}
        rx={2}
        onPointerDown={(e) => onResizePointerDown(e, instanceId)}
      >
        <title>Drag to resize the body</title>
      </rect>
    </g>
  );
}

interface HandleProps {
  x: number;
  y: number;
  label: string;
  title: string;
  onRun: () => void;
  onDown: (e: PointerEvent) => void;
}

function HandleButton({ x, y, label, title, onRun, onDown }: HandleProps) {
  return (
    <g
      className="fp-handle"
      onPointerDown={(e) => {
        onDown(e);
        onRun();
      }}
    >
      <title>{title}</title>
      <circle className="fp-handle__bg" cx={x} cy={y} r={10} />
      <text className="fp-handle__icon" x={x} y={y + 4} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
