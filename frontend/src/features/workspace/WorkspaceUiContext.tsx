import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface WorkspaceUiValue {
  codeOpen: boolean;
  openCode: () => void;
  closeCode: () => void;
  examplesOpen: boolean;
  openExamples: () => void;
  closeExamples: () => void;
}

const WorkspaceUiContext = createContext<WorkspaceUiValue | null>(null);

export function WorkspaceUiProvider({ children }: { children: ReactNode }) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const value = useMemo<WorkspaceUiValue>(
    () => ({
      codeOpen,
      openCode: () => setCodeOpen(true),
      closeCode: () => setCodeOpen(false),
      examplesOpen,
      openExamples: () => setExamplesOpen(true),
      closeExamples: () => setExamplesOpen(false),
    }),
    [codeOpen, examplesOpen],
  );
  return <WorkspaceUiContext.Provider value={value}>{children}</WorkspaceUiContext.Provider>;
}

export function useWorkspaceUi(): WorkspaceUiValue {
  const value = useContext(WorkspaceUiContext);
  if (!value) throw new Error("useWorkspaceUi must be used inside <WorkspaceUiProvider>");
  return value;
}
