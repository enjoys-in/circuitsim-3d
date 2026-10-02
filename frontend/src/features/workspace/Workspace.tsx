import { lazy } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { cx } from "../../shared/lib/format";
import { AsyncBoundary } from "../../shared/ui/AsyncBoundary";
import Board from "../board/Board";
import { BoardSkeleton } from "../board/BoardSkeleton";
import { CircuitGraphProvider } from "../board/CircuitGraphProvider";
import { HighlightProvider } from "../board/HighlightContext";
import { CodeSheet } from "../codeSheet/CodeSheet";
import { LevelGallery } from "../examples/LevelGallery";
import { ShortcutsCheatsheet } from "../shortcuts/ShortcutsCheatsheet";
import { ScopeSheet } from "../scope/ScopeSheet";
import { SweepSheet } from "../sweep/SweepSheet";
import { AcSheet } from "../sweep/AcSheet";
import { VerifySheet } from "../verify/VerifySheet";
import { InspectorSkeleton } from "../inspector/InspectorSkeleton";
import { PcbProvider } from "../pcb/PcbProvider";
import { ResultsSkeleton } from "../results/ResultsSkeleton";
import { SimulationProvider } from "../simulation/SimulationProvider";
import { SimulationSound } from "../sound/SimulationSound";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { WorkspaceUiProvider, useWorkspaceUi } from "./WorkspaceUiContext";
import "./workspace.css";

const RightPanel = lazy(() => import("../inspector/RightPanel"));
const ResultsDock = lazy(() => import("../results/ResultsDock"));
const PcbView = lazy(() => import("../pcb/PcbView"));

function RightSide() {
  const { panelCollapsed, togglePanel } = useWorkspaceUi();
  return (
    <div className={cx("right-dock", panelCollapsed && "right-dock--collapsed")}>
      <button
        type="button"
        className="panel-reopen"
        onClick={togglePanel}
        title="Show panel"
        aria-label="Show panel"
      >
        ‹
      </button>
      <div className="right-dock__panel" aria-hidden={panelCollapsed}>
        <AsyncBoundary name="Panel" fallback={<InspectorSkeleton />}>
          <RightPanel />
        </AsyncBoundary>
      </div>
    </div>
  );
}

function WorkspaceBody() {
  const { mode, setMode } = useWorkspaceUi();
  const schematic = mode === "schematic";
  return (
    <>
      <SimulationSound />
      <div className="workspace">
        <div className="workspace__main">
          <WorkspaceTabs mode={mode} onChange={setMode} />
          {schematic ? (
            <Board />
          ) : (
            <AsyncBoundary name="PCB editor" fallback={<BoardSkeleton />}>
              <PcbView />
            </AsyncBoundary>
          )}
          {schematic && (
            <AsyncBoundary name="Results" fallback={<ResultsSkeleton />}>
              <ResultsDock />
            </AsyncBoundary>
          )}
        </div>
        <RightSide />
      </div>
      <CodeSheet />
      <LevelGallery />
      <VerifySheet />
      <SweepSheet />
      <AcSheet />
      <ScopeSheet />
      <ShortcutsCheatsheet />
    </>
  );
}

export default function Workspace() {
  return (
    <ReactFlowProvider>
      <CircuitGraphProvider>
        <HighlightProvider>
          <SimulationProvider>
            <PcbProvider>
              <WorkspaceUiProvider>
                <WorkspaceBody />
              </WorkspaceUiProvider>
            </PcbProvider>
          </SimulationProvider>
        </HighlightProvider>
      </CircuitGraphProvider>
    </ReactFlowProvider>
  );
}
