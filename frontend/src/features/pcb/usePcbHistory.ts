import { useCallback, useEffect, useRef } from "react";
import type { Board, Placement, Trace, Via } from "./model/pcbTypes";

interface PcbStateSlice {
  placements: Map<string, Placement>;
  board: Board;
  traces: Trace[];
  vias: Via[];
}

export interface PcbSnapshot {
  placements: [string, Placement][];
  board: Board;
  traces: Trace[];
  vias: Via[];
}

export interface PcbHistory {
  undo: () => void;
  redo: () => void;
}

const LIMIT = 100;
const DEBOUNCE = 350;

function serialize(state: PcbStateSlice): string {
  return JSON.stringify({
    placements: [...state.placements],
    board: state.board,
    traces: state.traces,
    vias: state.vias,
  });
}

// Debounced snapshot history: once the layout settles and differs from the current
// baseline, the previous baseline is pushed so one undo rolls back a whole gesture
// (a drag, auto-route, etc.) rather than every intermediate frame.
export function usePcbHistory(state: PcbStateSlice, restore: (snapshot: PcbSnapshot) => void): PcbHistory {
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const baseline = useRef<string>(serialize(state));
  const armed = useRef(false);

  useEffect(() => {
    const snap = serialize(state);
    // Arm only once there is an actual layout, so undo never rolls back to a blank
    // board created before the initial auto-placement loads.
    if (!armed.current) {
      baseline.current = snap;
      if (state.placements.size > 0 || state.traces.length > 0) armed.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      if (snap !== baseline.current) {
        undoStack.current.push(baseline.current);
        if (undoStack.current.length > LIMIT) undoStack.current.shift();
        redoStack.current = [];
        baseline.current = snap;
      }
    }, DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [state.placements, state.board, state.traces, state.vias]);

  const apply = useCallback(
    (raw: string) => {
      baseline.current = raw; // set first so the restore's state change records nothing
      restore(JSON.parse(raw) as PcbSnapshot);
    },
    [restore],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev === undefined) return;
    redoStack.current.push(baseline.current);
    apply(prev);
  }, [apply]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next === undefined) return;
    undoStack.current.push(baseline.current);
    apply(next);
  }, [apply]);

  return { undo, redo };
}
