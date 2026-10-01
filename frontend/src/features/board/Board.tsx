import { useRef } from "react";
import { Background, BackgroundVariant, ConnectionMode, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "../../shared/ui/Button";
import { FEATURED_EXAMPLES } from "../examples/examples";
import { useExampleLoader } from "../examples/useExampleLoader";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import { useCatalog } from "../catalog/CatalogContext";
import { BoardToolbar } from "./BoardToolbar";
import { BoardSkeleton } from "./BoardSkeleton";
import { BoardContextMenu } from "./contextMenu/BoardContextMenu";
import { useContextMenu } from "./contextMenu/useContextMenu";
import { useCircuitGraph } from "./CircuitGraphContext";
import { edgeTypes, nodeTypes } from "./flowTypes";
import { useBoardShortcuts } from "./useBoardShortcuts";
import "./board.css";

const CONNECTION_LINE = { stroke: "#fbbf24", strokeWidth: 3 };
const DEFAULT_VIEWPORT = { x: 80, y: 80, zoom: 0.68 };

function EmptyBoard() {
  const loadExample = useExampleLoader();
  const { openExamples } = useWorkspaceUi();
  return (
    <div className="board-empty">
      <h2>Start building</h2>
      <p>Drag parts from the library onto the mat and wire their pins together, or open an example.</p>
      <div className="board-empty__examples">
        {FEATURED_EXAMPLES.map((example) => (
          <Button key={example.id} onClick={() => loadExample(example.id)} title={example.description}>
            {example.title}
          </Button>
        ))}
      </div>
      <Button variant="primary" className="board-empty__browse" onClick={openExamples}>
        Browse projects by level →
      </Button>
    </div>
  );
}

export default function Board() {
  const graph = useCircuitGraph();
  const { status } = useCatalog();
  const contextMenu = useContextMenu();
  const pointer = useRef({ x: 0, y: 0 });
  useBoardShortcuts(pointer);

  // Show a skeleton until the catalog is ready so the canvas doesn't flash the
  // empty "start building" state before a saved circuit is restored.
  if (status === "idle" || status === "pending") {
    return <BoardSkeleton />;
  }

  return (
    <section
      className="board"
      onDrop={graph.onDrop}
      onDragOver={graph.onDragOver}
      onPointerMove={(e) => (pointer.current = { x: e.clientX, y: e.clientY })}
    >
      <BoardToolbar />
      <div className="board__canvas">
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={graph.onNodesChange}
          onEdgesChange={graph.onEdgesChange}
          onConnect={graph.onConnect}
          isValidConnection={graph.isValidConnection}
          onSelectionChange={graph.onSelectionChange}
          onNodeContextMenu={contextMenu.onNodeContextMenu}
          onEdgeContextMenu={contextMenu.onEdgeContextMenu}
          onPaneContextMenu={contextMenu.onPaneContextMenu}
          onPaneClick={contextMenu.close}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={CONNECTION_LINE}
          deleteKeyCode={["Delete", "Backspace"]}
          snapToGrid
          snapGrid={[8, 8]}
          minZoom={0.2}
          maxZoom={3}
          defaultViewport={DEFAULT_VIEWPORT}
          colorMode="dark"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="#2b5d62" />
          <Controls showInteractive={false} />
        </ReactFlow>
        {graph.nodes.length === 0 && <EmptyBoard />}
        {contextMenu.menu && <BoardContextMenu menu={contextMenu.menu} onClose={contextMenu.close} />}
      </div>
    </section>
  );
}
