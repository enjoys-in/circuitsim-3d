import { lazy } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { AsyncBoundary } from "../../shared/ui/AsyncBoundary";
import Board from "../board/Board";
import { BoardSkeleton } from "../board/BoardSkeleton";
import { CircuitGraphProvider } from "../board/CircuitGraphProvider";
import { CodeSheet } from "../codeSheet/CodeSheet";
import { LevelGallery } from "../examples/LevelGallery";
import { InspectorSkeleton } from "../inspector/InspectorSkeleton";
import { PcbProvider } from "../pcb/PcbProvider";
import { ResultsSkeleton } from "../results/ResultsSkeleton";
import { SimulationProvider } from "../simulation/SimulationProvider";
import { SimulationSound } from "../sound/SimulationSound";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { WorkspaceUiProvider } from "./WorkspaceUiContext";
import { useWorkspaceMode } from "./useWorkspaceMode";
import "./workspace.css";

const RightPanel = lazy(() => import("../inspector/RightPanel"));
const ResultsDock = lazy(() => import("../results/ResultsDock"));
const PcbView = lazy(() => import("../pcb/PcbView"));

export default function Workspace() {
  const [mode, setMode] = useWorkspaceMode();
  const schematic = mode === "schematic";

  return (
    <ReactFlowProvider>
      <CircuitGraphProvider>
        <SimulationProvider>
          <PcbProvider>
            <WorkspaceUiProvider>
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
                <AsyncBoundary name="Panel" fallback={<InspectorSkeleton />}>
                  <RightPanel />
                </AsyncBoundary>
              </div>
              <CodeSheet />
              <LevelGallery />
            </WorkspaceUiProvider>
          </PcbProvider>
        </SimulationProvider>
      </CircuitGraphProvider>
    </ReactFlowProvider>
  );
}
