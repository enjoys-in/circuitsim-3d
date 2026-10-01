import { useEffect, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCircuitActions, useCircuitGraph } from "./CircuitGraphContext";

export function useBoardShortcuts(pointer: RefObject<{ x: number; y: number }>): void {
  const { selectedNodeId } = useCircuitGraph();
  const actions = useCircuitActions();
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select")) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
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
