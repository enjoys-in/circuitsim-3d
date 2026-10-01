import { createContext, useContext, type DragEvent } from "react";
import type { Connection, OnEdgesChange, OnNodesChange, OnSelectionChangeFunc } from "@xyflow/react";
import type { Circuit, ComponentDef, Params, Position } from "../../domain";
import type { PartNodeType, WireEdgeType } from "./nodes/types";

export interface CircuitGraphValue {
  nodes: PartNodeType[];
  edges: WireEdgeType[];
  onNodesChange: OnNodesChange<PartNodeType>;
  onEdgesChange: OnEdgesChange<WireEdgeType>;
  onConnect: (connection: Connection) => void;
  isValidConnection: (connection: Connection | WireEdgeType) => boolean;
  onDrop: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onSelectionChange: OnSelectionChangeFunc<PartNodeType, WireEdgeType>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hasClipboard: boolean;
  circuit: Circuit;
  circuitKey: string;
}

export interface CircuitActions {
  updateParams: (id: string, patch: Params) => void;
  setLabel: (id: string, label: string) => void;
  interact: (id: string) => void;
  addPart: (def: ComponentDef, opts?: { params?: Params; label?: string; position?: Position }) => string;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  duplicateNode: (id: string) => void;
  copyNode: (id: string) => void;
  pasteAt: (position: Position) => void;
  clear: () => void;
  loadCircuit: (circuit: Circuit) => void;
}

export const CircuitGraphContext = createContext<CircuitGraphValue | null>(null);
export const CircuitActionsContext = createContext<CircuitActions | null>(null);

export function useCircuitGraph(): CircuitGraphValue {
  const value = useContext(CircuitGraphContext);
  if (!value) throw new Error("useCircuitGraph must be used inside <CircuitGraphProvider>");
  return value;
}

export function useCircuitActions(): CircuitActions {
  const value = useContext(CircuitActionsContext);
  if (!value) throw new Error("useCircuitActions must be used inside <CircuitGraphProvider>");
  return value;
}
