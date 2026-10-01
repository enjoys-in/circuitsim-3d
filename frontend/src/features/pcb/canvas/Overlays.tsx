import { memo } from "react";
import { constrain45, polyline } from "../model/geometry";
import type { Airwire, DrcViolation, Point, RoutingSession } from "../model/pcbTypes";
import { LAYER_COLOR } from "../model/pcbTypes";

export const Ratsnest = memo(function Ratsnest({ airwires }: { airwires: Airwire[] }) {
  return (
    <g className="ratsnest">
      {airwires.map((wire, i) => (
        <line key={i} x1={wire.a.x} y1={wire.a.y} x2={wire.b.x} y2={wire.b.y} className="ratsnest__wire" />
      ))}
    </g>
  );
});

export const RoutePreview = memo(function RoutePreview({
  routing,
  cursor,
}: {
  routing: RoutingSession;
  cursor: Point | null;
}) {
  const last = routing.points[routing.points.length - 1];
  const tip = cursor ? constrain45(last, cursor) : last;
  return (
    <g className="route-preview">
      <path d={polyline(routing.points)} stroke={LAYER_COLOR[routing.layer]} className="route-preview__laid" />
      <path d={polyline([last, tip])} stroke={LAYER_COLOR[routing.layer]} className="route-preview__pending" />
      {routing.points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} className="route-preview__node" />
      ))}
    </g>
  );
});

export const DrcMarkers = memo(function DrcMarkers({ violations }: { violations: DrcViolation[] }) {
  return (
    <g className="drc-markers">
      {violations
        .filter((v) => v.at)
        .map((v) => (
          <g key={v.id} transform={`translate(${v.at!.x},${v.at!.y})`}>
            <circle r={9} className="drc-marker__halo" />
            <path d="M-4,-4 L4,4 M4,-4 L-4,4" className="drc-marker__x" />
          </g>
        ))}
    </g>
  );
});
