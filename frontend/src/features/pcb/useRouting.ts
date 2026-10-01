import { useCallback, useMemo, useState } from "react";
import { usePersistentState } from "../../shared/hooks/usePersistentState";
import { snapPoint } from "./model/geometry";
import { planRoutes } from "./model/autoroute";
import type { Airwire, Layer, Obstacle, Point, RoutingSession, Trace, Via } from "./model/pcbTypes";
import { DEFAULT_TRACE_WIDTH, otherLayer } from "./model/pcbTypes";

const uid = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

export interface TraceEndpointUpdate {
  traceId: string;
  index: number;
  point: Point;
}

export interface RoutingController {
  traces: Trace[];
  vias: Via[];
  routing: RoutingSession | null;
  activeLayer: Layer;
  traceWidth: number;
  visible: Record<Layer, boolean>;
  selectedTraceId: string | null;
  highlightedNetId: string | null;
  setActiveLayer: (layer: Layer) => void;
  setTraceWidth: (width: number) => void;
  toggleVisible: (layer: Layer) => void;
  selectTrace: (id: string | null) => void;
  highlightNet: (netId: string | null) => void;
  setTraceEndpoints: (updates: TraceEndpointUpdate[]) => void;
  moveTracePoint: (id: string, index: number, point: Point) => void;
  insertTracePoint: (id: string, index: number, point: Point) => void;
  removeTracePoint: (id: string, index: number) => void;
  begin: (netId: string, point: Point, from: string) => void;
  extend: (point: Point) => void;
  via: (point: Point) => void;
  end: (point: Point, netId?: string | null) => boolean;
  abort: () => void;
  autoRoute: (airwires: Airwire[], obstacles?: Obstacle[]) => void;
  deleteTrace: (id: string) => void;
  deleteVia: (id: string) => void;
  clearRoutes: () => void;
  restoreRoutes: (traces: Trace[], vias: Via[]) => void;
}

export function useRouting(): RoutingController {
  const [traces, setTraces] = usePersistentState<Trace[]>("circuitsim.pcb.traces", []);
  const [vias, setVias] = usePersistentState<Via[]>("circuitsim.pcb.vias", []);
  const [routing, setRouting] = useState<RoutingSession | null>(null);
  const [activeLayer, setActiveLayer] = useState<Layer>("top");
  const [traceWidth, setTraceWidth] = useState(DEFAULT_TRACE_WIDTH);
  const [visible, setVisible] = useState<Record<Layer, boolean>>({ top: true, bottom: true });
  const [selectedTraceId, selectTrace] = useState<string | null>(null);
  const [highlightedNetId, highlightNet] = useState<string | null>(null);

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
      highlightedNetId,
      setActiveLayer,
      setTraceWidth,
      toggleVisible: (layer) => setVisible((v) => ({ ...v, [layer]: !v[layer] })),
      selectTrace,
      highlightNet,
      // Move specific trace endpoints so copper follows a dragged/rotated part.
      setTraceEndpoints: (updates) =>
        setTraces((prev) => {
          if (updates.length === 0) return prev;
          const byTrace = new Map<string, Map<number, Point>>();
          for (const u of updates) {
            const m = byTrace.get(u.traceId) ?? new Map<number, Point>();
            m.set(u.index, u.point);
            byTrace.set(u.traceId, m);
          }
          return prev.map((t) => {
            const m = byTrace.get(t.id);
            return m ? { ...t, points: t.points.map((p, i) => m.get(i) ?? p) } : t;
          });
        }),
      // Drag one joint of a trace so users can reshape auto-routed copper by hand.
      moveTracePoint: (id, index, point) =>
        setTraces((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, points: t.points.map((p, i) => (i === index ? point : p)) } : t,
          ),
        ),
      // Add a new joint at `index` (splitting a segment) to bend copper around things.
      insertTracePoint: (id, index, point) =>
        setTraces((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, points: [...t.points.slice(0, index), point, ...t.points.slice(index)] }
              : t,
          ),
        ),
      // Remove a joint; keep at least the two pad endpoints so the trace stays valid.
      removeTracePoint: (id, index) =>
        setTraces((prev) =>
          prev.map((t) =>
            t.id === id && t.points.length > 2
              ? { ...t, points: t.points.filter((_, i) => i !== index) }
              : t,
          ),
        ),
      // Pads sit off the routing grid, so start/finish on the pad's exact point.
      begin: (netId, point, from) =>
        setRouting({ netId, layer: activeLayer, points: [point], from }),
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
          // Only finish on a pad of the same net — no loose ends, no cross-net joins.
          if (netId !== r.netId) {
            ok = false;
            return r;
          }
          commit(r, [...r.points, point]);
          return null;
        });
        return ok;
      },
      abort: () => setRouting(null),
      // Lay copper for every remaining pin-to-pin connection. A greedy planner picks
      // each trace's elbow + layer (and drops a via to hop layers) to minimise shorts.
      autoRoute: (airwires, obstacles) => {
        if (airwires.length === 0) return;
        const plan = planRoutes(airwires, activeLayer, traces, obstacles ?? []);
        setTraces((prev) => [
          ...prev,
          ...plan.traces.map((pt) => ({
            id: uid("t"),
            netId: pt.netId,
            layer: pt.layer,
            width: traceWidth,
            points: pt.points,
          })),
        ]);
        if (plan.vias.length > 0) {
          setVias((prev) => [
            ...prev,
            ...plan.vias.map((v) => ({ id: uid("v"), netId: v.netId, x: v.x, y: v.y })),
          ]);
        }
      },
      deleteTrace: (id) => setTraces((prev) => prev.filter((t) => t.id !== id)),
      deleteVia: (id) => setVias((prev) => prev.filter((v) => v.id !== id)),
      clearRoutes: () => {
        setTraces([]);
        setVias([]);
        setRouting(null);
      },
      // Replace all copper at once (used by undo/redo).
      restoreRoutes: (nextTraces, nextVias) => {
        setTraces(nextTraces);
        setVias(nextVias);
        setRouting(null);
      },
    }),
    [traces, vias, routing, activeLayer, traceWidth, visible, selectedTraceId, highlightedNetId, commit],
  );
}
