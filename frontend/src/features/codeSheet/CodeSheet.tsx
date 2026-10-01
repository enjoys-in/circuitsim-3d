import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Sheet } from "../../shared/ui/Sheet";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useCatalog } from "../catalog/CatalogContext";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";
import { useLiveState } from "../simulation/SimulationContext";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";

const CodeEditorPanel = lazy(() => import("../codeEditor/CodeEditorPanel"));

export function CodeSheet() {
  const { codeOpen, closeCode } = useWorkspaceUi();
  const { circuit, selectedNodeId } = useCircuitGraph();
  const { byKey } = useCatalog();
  const { updateParams } = useCircuitActions();
  const live = useLiveState();

  const boards = useMemo(
    () => circuit.instances.filter((i) => byKey.get(i.component_key)?.category === "dev_board"),
    [circuit.instances, byKey],
  );
  const [boardId, setBoardId] = useState<string | null>(null);
  const activeId = boardId ?? (boards.some((b) => b.id === selectedNodeId) ? selectedNodeId : boards[0]?.id) ?? null;
  const board = boards.find((b) => b.id === activeId) ?? null;

  useEffect(() => {
    if (codeOpen && boards.some((b) => b.id === selectedNodeId)) setBoardId(selectedNodeId);
  }, [codeOpen, selectedNodeId, boards]);

  return (
    <Sheet
      open={codeOpen}
      title="Code & Flash"
      onClose={closeCode}
      actions={<span className="sheet__soon">MicroPython-style firmware</span>}
    >
      {boards.length === 0 ? (
        <EmptyState title="No board to flash">Drop an ESP32, Arduino or other dev board onto the canvas first.</EmptyState>
      ) : (
        <div className="code-sheet">
          {boards.length > 1 && (
            <select
              className="field__input code-sheet__picker"
              value={activeId ?? ""}
              onChange={(e) => setBoardId(e.target.value)}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} · {byKey.get(b.component_key)?.name}
                </option>
              ))}
            </select>
          )}
          {board && (
            <Suspense fallback={<Skeleton height={340} radius={8} />}>
              <CodeEditorPanel
                key={board.id}
                title={board.label}
                value={String(board.params.firmware ?? "")}
                defaultSource={String(byKey.get(board.component_key)?.default_params.firmware ?? "")}
                fault={live.instances[board.id]?.fault}
                onFlash={(source) => updateParams(board.id, { firmware: source })}
              />
            </Suspense>
          )}
          <p className="code-sheet__note">
            <strong>Check</strong> validates the firmware, <strong>Flash</strong> writes it to the selected board (runs
            on the next simulation tick), <strong>Download</strong> saves the <code>.py</code> file, and{" "}
            <strong>Reset</strong> restores the board default.
          </p>
        </div>
      )}
    </Sheet>
  );
}
