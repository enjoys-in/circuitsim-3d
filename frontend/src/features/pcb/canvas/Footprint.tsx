import { memo, type PointerEvent } from "react";
import type { ComponentDef, Params } from "../../../domain";
import { cx } from "../../../shared/lib/format";
import { getPart } from "../../parts";
import { getFootprint } from "../model/footprints";
import type { PadInfo } from "../model/nets";
import type { Placement } from "../model/pcbTypes";
import { PAD_HIT_RADIUS, RECT_PAD, ROUND_PAD } from "../model/pcbTypes";

export type PcbRenderMode = "wire" | "real";

interface Props {
  instanceId: string;
  label: string;
  def: ComponentDef;
  params: Params;
  placement: Placement;
  pads: PadInfo[];
  selected: boolean;
  selectedPadId: string | null;
  render: PcbRenderMode;
  highlightNet: string | null;
  onBodyPointerDown: (e: PointerEvent, instanceId: string) => void;
  onPadPointerDown: (e: PointerEvent, pad: PadInfo) => void;
}

function FootprintImpl({
  instanceId,
  label,
  def,
  params,
  placement,
  pads,
  selected,
  selectedPadId,
  render,
  highlightNet,
  onBodyPointerDown,
  onPadPointerDown,
}: Props) {
  const footprint = getFootprint(def);
  const cx0 = placement.x;
  const cy0 = placement.y;
  const bodyW = placement.bodyW ?? footprint.width;
  const bodyH = placement.bodyH ?? footprint.height;
  const rot = placement.rotation;
  const rad = (rot * Math.PI) / 180;
  // Half-height of the rotated body, so the ref label clears it.
  const labelClear = (Math.abs(bodyW * Math.sin(rad)) + Math.abs(bodyH * Math.cos(rad))) / 2;
  const sideClass = placement.side === "bottom" ? "fp fp--bottom" : "fp fp--top";
  const partScale = placement.padScale ?? 1;
  const partAngle = placement.padAngle ?? 0;
  const shapeOf = new Map(footprint.pads.map((p) => [p.name, p.shape]));
  const art = render === "real" ? getPart(def) : null;

  return (
    <g className={selected ? `${sideClass} fp--selected` : sideClass}>
      <rect
        className="fp__body"
        x={cx0 - bodyW / 2}
        y={cy0 - bodyH / 2}
        width={bodyW}
        height={bodyH}
        rx={6}
        transform={`rotate(${rot} ${cx0} ${cy0})`}
        onPointerDown={(e) => onBodyPointerDown(e, instanceId)}
      />
      {art && (
        <g
          pointerEvents="none"
          transform={`rotate(${rot} ${cx0} ${cy0}) translate(${cx0 - bodyW / 2} ${cy0 - bodyH / 2}) scale(${bodyW / art.width} ${bodyH / art.height})`}
        >
          <art.Art def={def} params={params} />
        </g>
      )}
      <text className="fp__ref" x={cx0} y={cy0 - labelClear - 5} textAnchor="middle">
        {label}
      </text>
      {pads.map((pad) => {
        const active = highlightNet !== null && pad.netId === highlightNet;
        const picked = selectedPadId === pad.id;
        const round = (shapeOf.get(pad.name) ?? "round") === "round";
        const override = placement.pads?.[pad.name];
        const base = round ? ROUND_PAD : RECT_PAD;
        const pw = override?.w ?? base * partScale;
        const ph = override?.h ?? base * partScale;
        const angle = (placement.rotation + (override?.angle ?? partAngle)) % 360;
        const padClass = cx("fp__pad", active && "fp__pad--active", picked && "fp__pad--selected");
        const cxp = pad.point.x;
        const cyp = pad.point.y;
        const spin = `rotate(${angle} ${cxp} ${cyp})`;
        return (
          <g key={pad.id}>
            {round ? (
              <ellipse className={padClass} cx={cxp} cy={cyp} rx={pw / 2} ry={ph / 2} transform={spin} />
            ) : (
              <rect
                className={padClass}
                x={cxp - pw / 2}
                y={cyp - ph / 2}
                width={pw}
                height={ph}
                rx={2}
                transform={spin}
              />
            )}
            <circle className="fp__drill" cx={cxp} cy={cyp} r={2 * partScale} />
            <circle
              className="fp__hit"
              cx={cxp}
              cy={cyp}
              r={Math.max(PAD_HIT_RADIUS, Math.max(pw, ph) / 2 + 2)}
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
