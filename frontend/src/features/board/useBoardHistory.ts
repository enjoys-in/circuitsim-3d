import { useCallback, useEffect, useRef } from "react";
import type { PartNodeType, WireEdgeType } from "./nodes/types";

interface BoardSnapshot {
  nodes: PartNodeType[];
  edges: WireEdgeType[];
}

export interface BoardHistory {
  undo: () => void;
  redo: () => void;
}

const LIMIT = 100;
const DEBOUNCE = 350;

// Only the fields that define the circuit — selection/measured/dragging flags are
// dropped so merely selecting a part never creates a history entry.
function serialize(nodes: PartNodeType[], edges: WireEdgeType[]): string {
  return JSON.stringify({
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type,
      data: e.data,
    })),
  });
}

// Debounced snapshot history for the schematic board, mirroring usePcbHistory: once
// edits settle and differ from the baseline, the previous baseline is pushed so one
// undo rolls back a whole gesture (a drag, a wire, a param change) rather than frames.
export function useBoardHistory(
  nodes: PartNodeType[],
  edges: WireEdgeType[],
  setNodes: (nodes: PartNodeType[]) => void,
  setEdges: (edges: WireEdgeType[]) => void,
): BoardHistory {
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const baseline = useRef<string>(serialize(nodes, edges));
  const armed = useRef(false);

  useEffect(() => {
    const snap = serialize(nodes, edges);
    // Arm only once a real circuit exists, so undo never rolls back to the blank
    // board that precedes the restore of saved/shared work.
    if (!armed.current) {
      baseline.current = snap;
      if (nodes.length > 0) armed.current = true;
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
  }, [nodes, edges]);

  const apply = useCallback(
    (raw: string) => {
      baseline.current = raw; // set first so the restore's state change records nothing
      const snap = JSON.parse(raw) as BoardSnapshot;
      setNodes(snap.nodes);
      setEdges(snap.edges);
    },
    [setNodes, setEdges],
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
