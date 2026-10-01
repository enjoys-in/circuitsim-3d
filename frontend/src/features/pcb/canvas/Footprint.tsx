import { memo, type PointerEvent } from "react";
import type { ComponentDef } from "../../../domain";
import { getFootprint } from "../model/footprints";
import { padWorld } from "../model/geometry";
import type { PadInfo } from "../model/nets";
import type { Placement } from "../model/pcbTypes";
import { PAD_HIT_RADIUS } from "../model/pcbTypes";

interface Props {
  instanceId: string;
  label: string;
  def: ComponentDef;
  placement: Placement;
  pads: PadInfo[];
  selected: boolean;
  highlightNet: string | null;
  onBodyPointerDown: (e: PointerEvent, instanceId: string) => void;
  onPadPointerDown: (e: PointerEvent, pad: PadInfo) => void;
}

function FootprintImpl({
  instanceId,
  label,
  def,
  placement,
  pads,
  selected,
  highlightNet,
  onBodyPointerDown,
  onPadPointerDown,
}: Props) {
  const footprint = getFootprint(def);
  const center = { x: placement.x, y: placement.y };
  const cornerA = padWorld({ x: 0, y: 0 }, placement, footprint);
  const cornerB = padWorld({ x: footprint.width, y: footprint.height }, placement, footprint);
  const x = Math.min(cornerA.x, cornerB.x);
  const y = Math.min(cornerA.y, cornerB.y);
  const w = Math.abs(cornerB.x - cornerA.x);
  const h = Math.abs(cornerB.y - cornerA.y);
  const sideClass = placement.side === "bottom" ? "fp fp--bottom" : "fp fp--top";

  return (
    <g className={selected ? `${sideClass} fp--selected` : sideClass}>
      <rect
        className="fp__body"
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        onPointerDown={(e) => onBodyPointerDown(e, instanceId)}
      />
      <text className="fp__ref" x={center.x} y={y - 5} textAnchor="middle">
        {label}
      </text>
      {pads.map((pad) => {
        const active = highlightNet !== null && pad.netId === highlightNet;
        return (
          <g key={pad.id}>
            <circle
              className={active ? "fp__pad fp__pad--active" : "fp__pad"}
              cx={pad.point.x}
              cy={pad.point.y}
              r={5}
            />
            <circle className="fp__drill" cx={pad.point.x} cy={pad.point.y} r={2} />
            <circle
              className="fp__hit"
              cx={pad.point.x}
              cy={pad.point.y}
              r={PAD_HIT_RADIUS}
              onPointerDown={(e) => onPadPointerDown(e, pad)}
            >
              <title>{`${label}.${pad.name}`}</title>
            </circle>
          </g>
        );
      })}
    </g>
  );
}

export const Footprint = memo(FootprintImpl);
