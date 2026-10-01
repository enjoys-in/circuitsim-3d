import { memo, type MouseEvent, type PointerEvent } from "react";
import { polyline } from "../model/geometry";
import type { Layer, Trace, Via } from "../model/pcbTypes";
import { LAYER_COLOR, VIA_RADIUS } from "../model/pcbTypes";

interface Props {
  traces: Trace[];
  vias: Via[];
  visible: Record<Layer, boolean>;
  selectedTraceId: string | null;
  highlightNet: string | null;
  onTracePointerDown: (e: PointerEvent, id: string) => void;
  onTraceContextMenu: (e: MouseEvent, id: string) => void;
  onTraceDoubleClick: (e: MouseEvent, id: string) => void;
  onViaContextMenu: (e: MouseEvent, id: string) => void;
}

function TraceLayerImpl({
  traces,
  vias,
  visible,
  selectedTraceId,
  highlightNet,
  onTracePointerDown,
  onTraceContextMenu,
  onTraceDoubleClick,
  onViaContextMenu,
}: Props) {
  const traceClass = (trace: Trace): string => {
    if (selectedTraceId === trace.id) return "trace trace--selected";
    if (highlightNet === null) return "trace";
    return trace.netId === highlightNet ? "trace trace--highlight" : "trace trace--dim";
  };
  return (
    <g className="traces">
      {traces
        .filter((trace) => visible[trace.layer])
        .map((trace) => (
          <g key={trace.id} className={traceClass(trace)}>
            <path
              d={polyline(trace.points)}
              stroke={LAYER_COLOR[trace.layer]}
              strokeWidth={trace.width}
              className="trace__copper"
            />
            <path
              d={polyline(trace.points)}
              strokeWidth={Math.max(trace.width + 14, 18)}
              className="trace__hit"
              onPointerDown={(e) => onTracePointerDown(e, trace.id)}
              onDoubleClick={(e) => onTraceDoubleClick(e, trace.id)}
              onContextMenu={(e) => onTraceContextMenu(e, trace.id)}
            />
          </g>
        ))}
      {vias.map((via) => (
        <g key={via.id} onContextMenu={(e) => onViaContextMenu(e, via.id)}>
          <circle cx={via.x} cy={via.y} r={VIA_RADIUS} className="via__ring" />
          <circle cx={via.x} cy={via.y} r={VIA_RADIUS - 2} className="via__hole" />
        </g>
      ))}
    </g>
  );
}

export const TraceLayer = memo(TraceLayerImpl);
