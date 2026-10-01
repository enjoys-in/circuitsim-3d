import { cx } from "../../shared/lib/format";
import type { WorkspaceMode } from "./useWorkspaceMode";

interface Props {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
}

const MODES: { key: WorkspaceMode; label: string; hint: string }[] = [
  { key: "schematic", label: "Schematic", hint: "Place & wire parts" },
  { key: "pcb", label: "PCB layout", hint: "Route copper" },
];

export function WorkspaceTabs({ mode, onChange }: Props) {
  return (
    <div className="workspace-tabs" role="tablist">
      {MODES.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={mode === item.key}
          className={cx("workspace-tabs__tab", mode === item.key && "workspace-tabs__tab--active")}
          onClick={() => onChange(item.key)}
        >
          <strong>{item.label}</strong>
          <span>{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
