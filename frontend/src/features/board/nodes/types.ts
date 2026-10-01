import type { Edge, Node } from "@xyflow/react";
import type { ComponentDef, Params } from "../../../domain";

export interface PartNodeData extends Record<string, unknown> {
  def: ComponentDef;
  label: string;
  params: Params;
}

export type PartNodeType = Node<PartNodeData, "part">;

export interface WireData extends Record<string, unknown> {
  color: string;
}

export type WireEdgeType = Edge<WireData, "wire">;
