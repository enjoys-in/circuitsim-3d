import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type NodeChange,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import type { ComponentDef, Circuit, Params } from "../../domain";
import { DRAG_MIME, PRESET_MIME } from "../../shared/constants";
import { getPart } from "../parts";
import type { CircuitGraphValue } from "./CircuitGraphContext";
import { CircuitBuilder, electricalKey } from "./model/CircuitBuilder";
import { circuitToGraph } from "./model/circuitToGraph";
import { nextDesignator } from "./model/designators";
import { createPartNode } from "./model/nodeFactory";
import { pickWireColor } from "./model/wireColors";
import type { PartNodeType, WireEdgeType } from "./nodes/types";
import { useGraphActions } from "./useGraphActions";

const uid = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

const CIRCUIT_STORAGE_KEY = "circuitsim.circuit";

function readPreset(raw: string): { name: string; params: Params } | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const { name, params } = parsed as { name?: unknown; params?: unknown };
      return { name: typeof name === "string" ? name : "", params: (params as Params) ?? {} };
    }
  } catch {
    return null;
  }
  return null;
}

function sameWire(edge: WireEdgeType, c: Connection | WireEdgeType): boolean {
  const forward =
    edge.source === c.source &&
    edge.sourceHandle === c.sourceHandle &&
    edge.target === c.target &&
    edge.targetHandle === c.targetHandle;
  const backward =
    edge.source === c.target &&
    edge.sourceHandle === c.targetHandle &&
    edge.target === c.source &&
    edge.targetHandle === c.sourceHandle;
  return forward || backward;
}

export function useCircuitGraphState(catalog: ReadonlyMap<string, ComponentDef>) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PartNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WireEdgeType>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow<PartNodeType, WireEdgeType>();
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const { actions, hasClipboard } = useGraphActions(nodesRef, setNodes, setEdges, catalog, fitView);

  // While a part is being dragged we only move pixels — the electrical circuit is
  // unchanged — so freeze the derived circuit to avoid rebuilding it every frame on
  // big boards (keeps dragging smooth).
  const [dragging, setDragging] = useState(false);
  const handleNodesChange = useCallback(
    (changes: NodeChange<PartNodeType>[]) => {
      for (const change of changes) {
        if (change.type === "position" && typeof change.dragging === "boolean") setDragging(change.dragging);
      }
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((prev) => {
        const defOf = (id: string) => nodesRef.current.find((n) => n.id === id)?.data.def;
        const color = pickWireColor(
          [
            [defOf(connection.source), connection.sourceHandle],
            [defOf(connection.target), connection.targetHandle],
          ],
          prev.length,
        );
        return addEdge({ ...connection, id: uid("w"), type: "wire", data: { color } }, prev);
      });
    },
    [setEdges],
  );

  const isValidConnection = useCallback(
    (c: Connection | WireEdgeType) =>
      !(c.source === c.target && c.sourceHandle === c.targetHandle) && !edges.some((e) => sameWire(e, c)),
    [edges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const def = catalog.get(event.dataTransfer.getData(DRAG_MIME));
      if (!def) return;
      const spec = getPart(def);
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const position = { x: point.x - spec.width / 2, y: point.y - spec.height / 2 };
      const preset = readPreset(event.dataTransfer.getData(PRESET_MIME));
      setNodes((prev) => [
        ...prev,
        createPartNode({
          id: uid("p"),
          def,
          position,
          label: preset?.name || nextDesignator(def, prev.map((n) => n.data.label)),
          params: preset?.params,
        }),
      ]);
    },
    [catalog, screenToFlowPosition, setNodes],
  );

  const onSelectionChange = useCallback<OnSelectionChangeFunc<PartNodeType, WireEdgeType>>(
    ({ nodes: pickedNodes, edges: pickedEdges }) => {
      setSelectedNodeId(pickedNodes.length === 1 ? pickedNodes[0].id : null);
      setSelectedEdgeId(pickedNodes.length === 0 && pickedEdges.length === 1 ? pickedEdges[0].id : null);
    },
    [],
  );

  const frozen = useRef<{ circuit: Circuit; key: string } | null>(null);
  const circuit = useMemo(() => {
    if (dragging && frozen.current) return frozen.current.circuit;
    const built = new CircuitBuilder().fromNodes(nodes).fromEdges(edges).build();
    frozen.current = { circuit: built, key: electricalKey(built) };
    return built;
  }, [nodes, edges, dragging]);
  const circuitKey = useMemo(() => frozen.current?.key ?? electricalKey(circuit), [circuit]);

  // Restore the last circuit once the catalog is ready, then keep saving it so a page
  // refresh resumes the work instead of starting from a blank board.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || catalog.size === 0) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(CIRCUIT_STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as Circuit) : null;
      if (saved?.instances?.length) {
        const graph = circuitToGraph(saved, catalog);
        setNodes(graph.nodes);
        setEdges(graph.edges);
      }
    } catch {
      /* corrupt storage — ignore */
    }
  }, [catalog, setNodes, setEdges]);

  useEffect(() => {
    if (!restored.current) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(CIRCUIT_STORAGE_KEY, JSON.stringify(circuit));
      } catch {
        /* storage unavailable */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [circuit]);

  const graph = useMemo<CircuitGraphValue>(
    () => ({
      nodes,
      edges,
      onNodesChange: handleNodesChange,
      onEdgesChange,
      onConnect,
      isValidConnection,
      onDrop,
      onDragOver,
      onSelectionChange,
      selectedNodeId,
      selectedEdgeId,
      hasClipboard,
      circuit,
      circuitKey,
    }),
    [
      nodes,
      edges,
      handleNodesChange,
      onEdgesChange,
      onConnect,
      isValidConnection,
      onDrop,
      onDragOver,
      onSelectionChange,
      selectedNodeId,
      selectedEdgeId,
      hasClipboard,
      circuit,
      circuitKey,
    ],
  );

  return { graph, actions };
}
