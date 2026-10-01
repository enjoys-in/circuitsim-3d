import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePersistentState } from "../../shared/hooks/usePersistentState";

interface WorkspaceUiValue {
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
  const [codeOpen, setCodeOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = usePersistentState<boolean>("circuitsim.panelCollapsed", false);
  const value = useMemo<WorkspaceUiValue>(
    () => ({
      codeOpen,
      openCode: () => setCodeOpen(true),
      closeCode: () => setCodeOpen(false),
      examplesOpen,
      openExamples: () => setExamplesOpen(true),
      closeExamples: () => setExamplesOpen(false),
      panelCollapsed,
      togglePanel: () => setPanelCollapsed((v) => !v),
    }),
    [codeOpen, examplesOpen, panelCollapsed, setPanelCollapsed],
  );
  return <WorkspaceUiContext.Provider value={value}>{children}</WorkspaceUiContext.Provider>;
}

export function useWorkspaceUi(): WorkspaceUiValue {
  const value = useContext(WorkspaceUiContext);
  if (!value) throw new Error("useWorkspaceUi must be used inside <WorkspaceUiProvider>");
  return value;
}
