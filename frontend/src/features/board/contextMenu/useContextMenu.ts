import { useCallback, useState, type MouseEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Position } from "../../../domain";
import type { PartNodeType, WireEdgeType } from "../nodes/types";

export type MenuTarget =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | { kind: "pane" };

export type MenuState = MenuTarget & {
  x: number;
  y: number;
  flow: Position;
};

export interface ContextMenuController {
  menu: MenuState | null;
  close: () => void;
  onNodeContextMenu: (event: MouseEvent, node: PartNodeType) => void;
  onEdgeContextMenu: (event: MouseEvent, edge: WireEdgeType) => void;
  onPaneContextMenu: (event: MouseEvent | globalThis.MouseEvent) => void;
}

export function useContextMenu(): ContextMenuController {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const openAt = useCallback(
    (event: MouseEvent | globalThis.MouseEvent, target: MenuTarget) => {
      event.preventDefault();
      setMenu({
        ...target,
        x: event.clientX,
        y: event.clientY,
        flow: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      });
    },
    [screenToFlowPosition],
  );

  return {
    menu,
    close: useCallback(() => setMenu(null), []),
    onNodeContextMenu: useCallback((event, node) => openAt(event, { kind: "node", id: node.id }), [openAt]),
    onEdgeContextMenu: useCallback((event, edge) => openAt(event, { kind: "edge", id: edge.id }), [openAt]),
    onPaneContextMenu: useCallback((event) => openAt(event, { kind: "pane" }), [openAt]),
  };
}
