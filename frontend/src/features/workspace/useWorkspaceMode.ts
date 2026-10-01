import { useState } from "react";

export type WorkspaceMode = "schematic" | "pcb";

export function useWorkspaceMode(initial: WorkspaceMode = "schematic") {
  return useState<WorkspaceMode>(initial);
}
