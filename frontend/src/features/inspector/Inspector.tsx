import { EmptyState } from "../../shared/ui/EmptyState";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { NodeInspector } from "./NodeInspector";
import { WireInspector } from "./WireInspector";
import "./inspector.css";

export default function Inspector() {
  const { nodes, edges, selectedNodeId, selectedEdgeId } = useCircuitGraph();
  const node = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : undefined;
  const edge = !node && selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : undefined;

  return (
    <aside className="inspector" aria-label="Inspector">
      <h2 className="panel-heading inspector__title">Inspector</h2>
      {node && <NodeInspector key={node.id} node={node} />}
      {edge && <WireInspector key={edge.id} edge={edge} />}
      {!node && !edge && (
        <EmptyState title="Nothing selected">
          Select a part to edit its values or firmware. Click switches and buttons on the board to toggle them.
        </EmptyState>
      )}
    </aside>
  );
}
