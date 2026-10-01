import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import type { PadInfo } from "../model/nets";
import type { Point } from "../model/pcbTypes";
import type { PcbState } from "../usePcbState";
import type { PanZoom } from "./usePanZoom";

interface DragState {
  instanceId: string;
  offset: Point;
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
  onPadPointerDown: (e: PointerEvent, pad: PadInfo) => void;
  onTracePointerDown: (e: PointerEvent, id: string) => void;
  onTraceContextMenu: (e: MouseEvent, id: string) => void;
  onViaContextMenu: (e: MouseEvent, id: string) => void;
}

export function usePcbInteraction(pcb: PcbState, view: PanZoom): Interaction {
  const [cursor, setCursor] = useState<Point | null>(null);
  const drag = useRef<DragState | null>(null);
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
      const board = view.toBoard(e.clientX, e.clientY);
      drag.current = { instanceId, offset: { x: board.x - placement.x, y: board.y - placement.y } };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pcb, view],
  );

  const onSvgPointerDown = useCallback(
    (e: PointerEvent) => {
      if (routingRef.current) pcb.extend(view.toBoard(e.clientX, e.clientY));
      else pan.current = { x: e.clientX, y: e.clientY };
    },
    [pcb, view],
  );

  const onSvgPointerMove = useCallback(
    (e: PointerEvent) => {
      const board = view.toBoard(e.clientX, e.clientY);
      if (drag.current) {
        pcb.moveComponent(drag.current.instanceId, {
          x: board.x - drag.current.offset.x,
          y: board.y - drag.current.offset.y,
        });
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
    onPadPointerDown,
    onTracePointerDown: useCallback((e: PointerEvent, id: string) => {
      e.stopPropagation();
      pcb.selectTrace(id);
    }, [pcb]),
    onTraceContextMenu: useCallback(
      (e: MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        pcb.deleteTrace(id);
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
