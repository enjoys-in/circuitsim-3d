import type { Edge, Node } from "@xyflow/react";
import type { ComponentDef, Params, Position } from "../../../domain";

export interface PartNodeData extends Record<string, unknown> {
  def: ComponentDef;
  label: string;
  params: Params;
  rotation?: number;
  flip?: boolean;
}

export type PartNodeType = Node<PartNodeData, "part">;

export interface WireData extends Record<string, unknown> {
  color: string;
  waypoints?: Position[];
}

export type WireEdgeType = Edge<WireData, "wire">;
