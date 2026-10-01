import type { EdgeTypes, NodeTypes } from "@xyflow/react";
import { WireEdge } from "./edges/WireEdge";
import { PartNode } from "./nodes/PartNode";

export const nodeTypes: NodeTypes = { part: PartNode };
export const edgeTypes: EdgeTypes = { wire: WireEdge };
