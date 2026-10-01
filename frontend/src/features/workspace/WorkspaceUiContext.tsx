import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePersistentState } from "../../shared/hooks/usePersistentState";
import type { WorkspaceMode } from "./useWorkspaceMode";

interface WorkspaceUiValue {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  codeOpen: boolean;
  openCode: () => void;
  closeCode: () => void;
  examplesOpen: boolean;
  openExamples: () => void;
  closeExamples: () => void;
  panelCollapsed: boolean;
  togglePanel: () => void;
}

const WorkspaceUiContext = createContext<WorkspaceUiValue | null>(null);

export function WorkspaceUiProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WorkspaceMode>("schematic");
  const [codeOpen, setCodeOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = usePersistentState<boolean>("circuitsim.panelCollapsed", false);
  const value = useMemo<WorkspaceUiValue>(
    () => ({
      mode,
      setMode,
      codeOpen,
      openCode: () => setCodeOpen(true),
      closeCode: () => setCodeOpen(false),
      examplesOpen,
      openExamples: () => setExamplesOpen(true),
      closeExamples: () => setExamplesOpen(false),
      panelCollapsed,
      togglePanel: () => setPanelCollapsed((v) => !v),
    }),
    [mode, codeOpen, examplesOpen, panelCollapsed, setPanelCollapsed],
  );
  return <WorkspaceUiContext.Provider value={value}>{children}</WorkspaceUiContext.Provider>;
}

export function useWorkspaceUi(): WorkspaceUiValue {
  const value = useContext(WorkspaceUiContext);
  if (!value) throw new Error("useWorkspaceUi must be used inside <WorkspaceUiProvider>");
  return value;
}
