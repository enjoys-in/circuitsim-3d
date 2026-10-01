import { useCallback, useMemo, useState } from "react";
import { snapPoint } from "./model/geometry";
import type { Layer, Point, RoutingSession, Trace, Via } from "./model/pcbTypes";
import { DEFAULT_TRACE_WIDTH, otherLayer } from "./model/pcbTypes";

const uid = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

export interface RoutingController {
  traces: Trace[];
  vias: Via[];
  routing: RoutingSession | null;
  activeLayer: Layer;
  traceWidth: number;
  visible: Record<Layer, boolean>;
  selectedTraceId: string | null;
  setActiveLayer: (layer: Layer) => void;
  setTraceWidth: (width: number) => void;
  toggleVisible: (layer: Layer) => void;
  selectTrace: (id: string | null) => void;
  begin: (netId: string, point: Point, from: string) => void;
  extend: (point: Point) => void;
  via: (point: Point) => void;
  end: (point: Point, netId?: string | null) => boolean;
  abort: () => void;
  deleteTrace: (id: string) => void;
  deleteVia: (id: string) => void;
  clearRoutes: () => void;
}

export function useRouting(): RoutingController {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [vias, setVias] = useState<Via[]>([]);
  const [routing, setRouting] = useState<RoutingSession | null>(null);
  const [activeLayer, setActiveLayer] = useState<Layer>("top");
  const [traceWidth, setTraceWidth] = useState(DEFAULT_TRACE_WIDTH);
  const [visible, setVisible] = useState<Record<Layer, boolean>>({ top: true, bottom: true });
  const [selectedTraceId, selectTrace] = useState<string | null>(null);

  const commit = useCallback((session: RoutingSession, points: Point[]) => {
    if (points.length < 2) return;
    setTraces((prev) => [
      ...prev,
      { id: uid("t"), netId: session.netId, layer: session.layer, width: traceWidth, points },
    ]);
  }, [traceWidth]);

  return useMemo<RoutingController>(
    () => ({
      traces,
      vias,
      routing,
      activeLayer,
      traceWidth,
      visible,
      selectedTraceId,
      setActiveLayer,
      setTraceWidth,
      toggleVisible: (layer) => setVisible((v) => ({ ...v, [layer]: !v[layer] })),
      selectTrace,
      begin: (netId, point, from) =>
        setRouting({ netId, layer: activeLayer, points: [snapPoint(point)], from }),
      extend: (point) => setRouting((r) => (r ? { ...r, points: [...r.points, snapPoint(point)] } : r)),
      via: (point) =>
        setRouting((r) => {
          if (!r) return r;
          const at = snapPoint(point);
          commit(r, [...r.points, at]);
          setVias((prev) => [...prev, { id: uid("v"), netId: r.netId, x: at.x, y: at.y }]);
          const next = otherLayer(r.layer);
          setActiveLayer(next);
          return { ...r, layer: next, points: [at] };
        }),
      end: (point, netId) => {
        let ok = true;
        setRouting((r) => {
          if (!r) return null;
          if (netId && netId !== r.netId) {
            ok = false;
            return r;
          }
          commit(r, [...r.points, snapPoint(point)]);
          return null;
        });
        return ok;
      },
      abort: () => setRouting(null),
      deleteTrace: (id) => setTraces((prev) => prev.filter((t) => t.id !== id)),
      deleteVia: (id) => setVias((prev) => prev.filter((v) => v.id !== id)),
      clearRoutes: () => {
        setTraces([]);
        setVias([]);
        setRouting(null);
      },
    }),
    [traces, vias, routing, activeLayer, traceWidth, visible, selectedTraceId, commit],
  );
}
