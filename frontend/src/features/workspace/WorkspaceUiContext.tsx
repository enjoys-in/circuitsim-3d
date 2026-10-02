import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { usePersistentState } from "../../shared/hooks/usePersistentState";
import type { WorkspaceMode } from "./useWorkspaceMode";

export type PanelTab = "inspect" | "assistant";
export type AssistantActionKind = "explain" | "fix";

export interface AssistantAction {
  id: number;
  kind: AssistantActionKind;
  warnings?: string[];
}

interface WorkspaceUiValue {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  codeOpen: boolean;
  openCode: () => void;
  closeCode: () => void;
  examplesOpen: boolean;
  openExamples: () => void;
  closeExamples: () => void;
  verifyOpen: boolean;
  openVerify: () => void;
  closeVerify: () => void;
  sweepOpen: boolean;
  openSweep: () => void;
  closeSweep: () => void;
  scopeOpen: boolean;
  openScope: () => void;
  closeScope: () => void;
  panelTab: PanelTab;
  setPanelTab: (tab: PanelTab) => void;
  assistantAction: AssistantAction | null;
  runAssistant: (kind: AssistantActionKind, warnings?: string[]) => void;
  clearAssistantAction: () => void;
  panelCollapsed: boolean;
  togglePanel: () => void;
}

const WorkspaceUiContext = createContext<WorkspaceUiValue | null>(null);

export function WorkspaceUiProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WorkspaceMode>("schematic");
  const [codeOpen, setCodeOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("inspect");
  const [assistantAction, setAssistantAction] = useState<AssistantAction | null>(null);
  const actionSeq = useRef(0);
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
      verifyOpen,
      openVerify: () => setVerifyOpen(true),
      closeVerify: () => setVerifyOpen(false),
      sweepOpen,
      openSweep: () => setSweepOpen(true),
      closeSweep: () => setSweepOpen(false),
      scopeOpen,
      openScope: () => setScopeOpen(true),
      closeScope: () => setScopeOpen(false),
      panelTab,
      setPanelTab,
      assistantAction,
      runAssistant: (kind, warnings) => {
        actionSeq.current += 1;
        setAssistantAction({ id: actionSeq.current, kind, warnings });
        setPanelTab("assistant");
        setPanelCollapsed(false);
      },
      clearAssistantAction: () => setAssistantAction(null),
      panelCollapsed,
      togglePanel: () => setPanelCollapsed((v) => !v),
    }),
    [mode, codeOpen, examplesOpen, verifyOpen, sweepOpen, scopeOpen, panelTab, assistantAction, panelCollapsed, setPanelCollapsed],
  );
  return <WorkspaceUiContext.Provider value={value}>{children}</WorkspaceUiContext.Provider>;
}

export function useWorkspaceUi(): WorkspaceUiValue {
  const value = useContext(WorkspaceUiContext);
  if (!value) throw new Error("useWorkspaceUi must be used inside <WorkspaceUiProvider>");
  return value;
}
