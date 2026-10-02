import { useEffect, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCircuitActions, useCircuitGraph } from "./CircuitGraphContext";

export function useBoardShortcuts(pointer: RefObject<{ x: number; y: number }>): void {
  const { selectedNodeId } = useCircuitGraph();
  const actions = useCircuitActions();
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches?.("input, textarea, select")) return;
      const key = event.key.toLowerCase();
      // Rotate / flip the selected part (no modifier, like the PCB editor).
      if (!event.ctrlKey && !event.metaKey && selectedNodeId) {
        if (key === "r") {
          event.preventDefault();
          actions.rotateNode(selectedNodeId);
          return;
        }
        if (key === "f") {
          event.preventDefault();
          actions.flipNode(selectedNodeId);
          return;
        }
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      // Undo / redo work with or without a selection.
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        actions.undo();
        return;
      }
      if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        actions.redo();
        return;
      }
      if (key === "d" && selectedNodeId) {
        event.preventDefault();
        actions.duplicateNode(selectedNodeId);
      } else if (key === "c" && selectedNodeId) {
        actions.copyNode(selectedNodeId);
      } else if (key === "v" && pointer.current) {
        actions.pasteAt(screenToFlowPosition(pointer.current));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, pointer, screenToFlowPosition, selectedNodeId]);
}
