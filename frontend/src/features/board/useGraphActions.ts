import { useCallback, useMemo, useRef, useState } from "react";
import type { Circuit, ComponentDef, Params, Position } from "../../domain";
import { getPart } from "../parts";
import type { CircuitActions } from "./CircuitGraphContext";
import { circuitToGraph } from "./model/circuitToGraph";
import { nextDesignator } from "./model/designators";
import { createPartNode } from "./model/nodeFactory";
import type { PartNodeType, WireEdgeType } from "./nodes/types";

type SetNodes = React.Dispatch<React.SetStateAction<PartNodeType[]>>;
type SetEdges = React.Dispatch<React.SetStateAction<WireEdgeType[]>>;

interface Clipboard {
  def: ComponentDef;
  label: string;
  params: Params;
}

const PASTE_OFFSET = 28;
const SPREAD_COLS = 6;
const uid = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

// Lay out parts added outside the schematic (e.g. from the PCB) on a tidy grid.
function spreadPosition(index: number): Position {
  return { x: 40 + (index % SPREAD_COLS) * 130, y: 40 + Math.floor(index / SPREAD_COLS) * 110 };
}

export function useGraphActions(
  nodesRef: React.MutableRefObject<PartNodeType[]>,
  setNodes: SetNodes,
  setEdges: SetEdges,
  catalog: ReadonlyMap<string, ComponentDef>,
  fitView: (options?: { padding?: number; duration?: number }) => void,
): { actions: CircuitActions; hasClipboard: boolean } {
  const clipboard = useRef<Clipboard | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);

  const patchNode = useCallback(
    (id: string, patch: (data: PartNodeType["data"]) => Partial<PartNodeType["data"]>) =>
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch(n.data) } } : n))),
    [setNodes],
  );

  const spawn = useCallback(
    (source: Clipboard, position: Position) =>
      setNodes((prev) => [
        ...prev,
        createPartNode({
          id: uid("p"),
          def: source.def,
          position,
          label: nextDesignator(source.def, prev.map((n) => n.data.label)),
          params: { ...source.params },
        }),
      ]),
    [setNodes],
  );

  const actions = useMemo<CircuitActions>(
    () => ({
      updateParams: (id, patch: Params) => patchNode(id, (data) => ({ params: { ...data.params, ...patch } })),
      setLabel: (id, label) => patchNode(id, () => ({ label })),
      interact: (id) =>
        patchNode(id, (data) => {
          const interact = getPart(data.def).interact;
          return interact ? { params: interact(data.params) } : {};
        }),
      addPart: (def, opts) => {
        const id = uid("p");
        setNodes((prev) => [
          ...prev,
          createPartNode({
            id,
            def,
            position: opts?.position ?? spreadPosition(prev.length),
            label: opts?.label || nextDesignator(def, prev.map((n) => n.data.label)),
            params: opts?.params,
          }),
        ]);
        return id;
      },
      removeNode: (id) => {
        setNodes((prev) => prev.filter((n) => n.id !== id));
        setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
      },
      removeEdge: (id) => setEdges((prev) => prev.filter((e) => e.id !== id)),
      duplicateNode: (id) => {
        const node = nodesRef.current.find((n) => n.id === id);
        if (node) spawn(node.data, { x: node.position.x + PASTE_OFFSET, y: node.position.y + PASTE_OFFSET });
      },
      copyNode: (id) => {
        const node = nodesRef.current.find((n) => n.id === id);
        if (!node) return;
        clipboard.current = { def: node.data.def, label: node.data.label, params: node.data.params };
        setHasClipboard(true);
      },
      pasteAt: (position) => {
        if (clipboard.current) spawn(clipboard.current, position);
      },
      clear: () => {
        setNodes([]);
        setEdges([]);
      },
      loadCircuit: (circuit: Circuit) => {
        const graph = circuitToGraph(circuit, catalog);
        setNodes(graph.nodes);
        setEdges(graph.edges);
        window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
      },
    }),
    [catalog, fitView, nodesRef, patchNode, setEdges, setNodes, spawn],
  );

  return { actions, hasClipboard };
}
