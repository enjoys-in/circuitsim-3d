import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { distance, pointToSegment, rotate, snap, snapPoint } from "../model/geometry";
import type { PadInfo } from "../model/nets";
import type { Point } from "../model/pcbTypes";
import { GRID } from "../model/pcbTypes";
import type { PcbState } from "../usePcbState";
import type { PanZoom } from "./usePanZoom";

const PAD_SNAP = 2;
// Pointer travel (px) before a press on a trace turns into a joint drag.
const TRACE_DRAG_THRESHOLD = 4;

interface TraceAnchor {
  traceId: string;
  index: number;
  base: Point;
}

interface DragState {
  instanceId: string;
  offset: Point;
  start: Point;
  anchors: TraceAnchor[];
}

export interface Interaction {
  cursor: Point | null;
  onSvgPointerDown: (e: PointerEvent) => void;
  onSvgPointerMove: (e: PointerEvent) => void;
  onSvgPointerUp: (e: PointerEvent) => void;
  onWheel: (e: WheelEvent) => void;
  onDoubleClick: () => void;
  onSvgContextMenu: (e: MouseEvent) => void;
  onBodyPointerDown: (e: PointerEvent, instanceId: string) => void;
  onResizePointerDown: (e: PointerEvent, instanceId: string) => void;
  onPadPointerDown: (e: PointerEvent, pad: PadInfo) => void;
  onTracePointerDown: (e: PointerEvent, id: string) => void;
  onTraceContextMenu: (e: MouseEvent, id: string) => void;
  onTraceDoubleClick: (e: MouseEvent, id: string) => void;
  onWaypointPointerDown: (e: PointerEvent, traceId: string, index: number) => void;
  onWaypointContextMenu: (e: MouseEvent, traceId: string, index: number) => void;
  onViaContextMenu: (e: MouseEvent, id: string) => void;
}

export function usePcbInteraction(pcb: PcbState, view: PanZoom): Interaction {
  const [cursor, setCursor] = useState<Point | null>(null);
  const drag = useRef<DragState | null>(null);
  const resize = useRef<{ instanceId: string } | null>(null);
  const waypoint = useRef<{ traceId: string; index: number } | null>(null);
  const tracePress = useRef<{ traceId: string; downX: number; downY: number } | null>(null);
  const pan = useRef<{ x: number; y: number } | null>(null);
  const routingRef = useRef(pcb.routing);
  routingRef.current = pcb.routing;

  useEffect(() => {
    if (!pcb.routing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") pcb.abort();
      else if (e.key === "Enter" && cursor) pcb.end(cursor);
      else if (e.key.toLowerCase() === "v" && cursor) pcb.via(cursor);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pcb, cursor]);

  // R rotates, F flips the selected part (when not routing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (routingRef.current) return;
      const id = pcb.selectedId;
      if (!id) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "r") {
        e.preventDefault();
        pcb.rotateComponent(id);
      } else if (key === "f") {
        e.preventDefault();
        pcb.flipComponent(id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pcb]);

  // Ctrl/Cmd+Z undoes, Ctrl/Cmd+Y (or Shift+Z) redoes the whole PCB layout.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        pcb.undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        pcb.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pcb]);

  const onPadPointerDown = useCallback(
    (e: PointerEvent, pad: PadInfo) => {
      e.stopPropagation();
      if (routingRef.current) pcb.end(pad.point, pad.netId);
      else if (pad.netId) pcb.begin(pad.netId, pad.point, pad.id);
    },
    [pcb],
  );

  const onBodyPointerDown = useCallback(
    (e: PointerEvent, instanceId: string) => {
      e.stopPropagation();
      if (routingRef.current) {
        pcb.extend(view.toBoard(e.clientX, e.clientY));
        return;
      }
      const placement = pcb.placements.get(instanceId);
      if (!placement) return;
      pcb.selectComponent(instanceId);
      const board = view.toBoard(e.clientX, e.clientY);
      const padPts = pcb.pads.filter((p) => p.instanceId === instanceId).map((p) => p.point);
      const anchors: TraceAnchor[] = [];
      for (const trace of pcb.traces) {
        const ends = trace.points.length < 2 ? [0] : [0, trace.points.length - 1];
        for (const index of ends) {
          const pt = trace.points[index];
          if (padPts.some((pp) => distance(pp, pt) <= PAD_SNAP)) anchors.push({ traceId: trace.id, index, base: pt });
        }
      }
      drag.current = {
        instanceId,
        offset: { x: board.x - placement.x, y: board.y - placement.y },
        start: { x: placement.x, y: placement.y },
        anchors,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pcb, view],
  );

  const onSvgPointerDown = useCallback(
    (e: PointerEvent) => {
      if (routingRef.current) {
        pcb.extend(view.toBoard(e.clientX, e.clientY));
        return;
      }
      pcb.selectComponent(null);
      pan.current = { x: e.clientX, y: e.clientY };
    },
    [pcb, view],
  );

  const onResizePointerDown = useCallback(
    (e: PointerEvent, instanceId: string) => {
      e.stopPropagation();
      if (routingRef.current) return;
      pcb.selectComponent(instanceId);
      resize.current = { instanceId };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pcb],
  );

  const onSvgPointerMove = useCallback(
    (e: PointerEvent) => {
      const board = view.toBoard(e.clientX, e.clientY);
      // A press on a selected trace becomes a joint drag once the pointer moves: grab the
      // nearest joint, or bend the segment by inserting a new one at the grab point.
      if (tracePress.current && !waypoint.current) {
        const moved = Math.hypot(e.clientX - tracePress.current.downX, e.clientY - tracePress.current.downY);
        if (moved >= TRACE_DRAG_THRESHOLD) {
          const trace = pcb.traces.find((t) => t.id === tracePress.current!.traceId);
          if (trace) {
            const at = snapPoint(view.toBoard(tracePress.current.downX, tracePress.current.downY));
            let near = -1;
            let nearDist = Infinity;
            trace.points.forEach((p, i) => {
              const d = distance(p, at);
              if (d < nearDist) {
                nearDist = d;
                near = i;
              }
            });
            if (nearDist <= GRID) {
              waypoint.current = { traceId: trace.id, index: near };
            } else {
              let seg = 1;
              let segDist = Infinity;
              for (let i = 0; i < trace.points.length - 1; i++) {
                const d = pointToSegment(at, trace.points[i], trace.points[i + 1]);
                if (d < segDist) {
                  segDist = d;
                  seg = i + 1;
                }
              }
              pcb.insertTracePoint(trace.id, seg, at);
              waypoint.current = { traceId: trace.id, index: seg };
            }
          }
          tracePress.current = null;
        }
      }
      if (waypoint.current) {
        pcb.moveTracePoint(waypoint.current.traceId, waypoint.current.index, snapPoint(board));
      } else if (resize.current) {
        const placement = pcb.placements.get(resize.current.instanceId);
        if (placement) {
          const local = rotate({ x: board.x - placement.x, y: board.y - placement.y }, -placement.rotation);
          pcb.setBodySize(resize.current.instanceId, {
            w: Math.abs(local.x) * 2,
            h: Math.abs(local.y) * 2,
          });
        }
      } else if (drag.current) {
        const target = { x: board.x - drag.current.offset.x, y: board.y - drag.current.offset.y };
        pcb.moveComponent(drag.current.instanceId, target);
        if (drag.current.anchors.length) {
          const dx = snap(target.x) - drag.current.start.x;
          const dy = snap(target.y) - drag.current.start.y;
          pcb.setTraceEndpoints(
            drag.current.anchors.map((a) => ({
              traceId: a.traceId,
              index: a.index,
              point: { x: a.base.x + dx, y: a.base.y + dy },
            })),
          );
        }
      } else if (pan.current) {
        view.panBy(e.clientX - pan.current.x, e.clientY - pan.current.y);
        pan.current = { x: e.clientX, y: e.clientY };
      }
      if (routingRef.current) setCursor(board);
      else if (cursor) setCursor(null);
    },
    [pcb, view, cursor],
  );

  const onSvgPointerUp = useCallback(() => {
    drag.current = null;
    resize.current = null;
    waypoint.current = null;
    tracePress.current = null;
    pan.current = null;
  }, []);

  return {
    cursor,
    onSvgPointerDown,
    onSvgPointerMove,
    onSvgPointerUp,
    onWheel: useCallback(
      (e: WheelEvent) => view.zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.1 : 0.9),
      [view],
    ),
    onDoubleClick: useCallback(() => {
      if (routingRef.current && cursor) pcb.end(cursor);
    }, [pcb, cursor]),
    onSvgContextMenu: useCallback(
      (e: MouseEvent) => {
        e.preventDefault();
        if (routingRef.current) pcb.abort();
      },
      [pcb],
    ),
    onBodyPointerDown,
    onResizePointerDown,
    onPadPointerDown,
    onTracePointerDown: useCallback((e: PointerEvent, id: string) => {
      e.stopPropagation();
      if (routingRef.current) return;
      pcb.selectTrace(id);
      // Capture the pointer so dragging the trace reshapes it instead of panning the board.
      tracePress.current = { traceId: id, downX: e.clientX, downY: e.clientY };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported — drag still works via bubbling */
      }
    }, [pcb]),
    onTraceContextMenu: useCallback(
      (e: MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        pcb.deleteTrace(id);
      },
      [pcb],
    ),
    // Double-click a trace to drop a new joint on the nearest segment.
    onTraceDoubleClick: useCallback(
      (e: MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const trace = pcb.traces.find((t) => t.id === id);
        if (!trace || trace.points.length < 2) return;
        const at = view.toBoard(e.clientX, e.clientY);
        let best = 1;
        let bestDist = Infinity;
        for (let i = 0; i < trace.points.length - 1; i++) {
          const d = pointToSegment(at, trace.points[i], trace.points[i + 1]);
          if (d < bestDist) {
            bestDist = d;
            best = i + 1;
          }
        }
        pcb.insertTracePoint(id, best, snapPoint(at));
        pcb.selectTrace(id);
      },
      [pcb, view],
    ),
    onWaypointPointerDown: useCallback(
      (e: PointerEvent, traceId: string, index: number) => {
        e.stopPropagation();
        if (routingRef.current) return;
        pcb.selectTrace(traceId);
        waypoint.current = { traceId, index };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      [pcb],
    ),
    onWaypointContextMenu: useCallback(
      (e: MouseEvent, traceId: string, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        pcb.removeTracePoint(traceId, index);
      },
      [pcb],
    ),
    onViaContextMenu: useCallback(
      (e: MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        pcb.deleteVia(id);
      },
      [pcb],
    ),
  };
}
