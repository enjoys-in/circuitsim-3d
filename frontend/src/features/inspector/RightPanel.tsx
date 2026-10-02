import { Tabs, type TabItem } from "../../shared/ui/Tabs";
import { useWorkspaceUi, type PanelTab } from "../workspace/WorkspaceUiContext";
import { AssistantPanel } from "../assistant/AssistantPanel";
import { PcbInspector } from "../pcb/PcbInspector";
import Inspector from "./Inspector";
import "./inspector.css";

const TABS: TabItem<PanelTab>[] = [
  { key: "inspect", label: "Inspector" },
  { key: "assistant", label: "Assistant", badge: "AI" },
];

export default function RightPanel() {
  const { togglePanel, mode, panelTab, setPanelTab } = useWorkspaceUi();
  return (
    <div className="right-panel">
      <Tabs
        items={TABS}
        active={panelTab}
        onChange={setPanelTab}
        trailing={
          <button
            type="button"
            className="right-panel__collapse"
            onClick={togglePanel}
            title="Hide panel"
            aria-label="Hide panel"
          >
            ›
          </button>
        }
      />
      <div className="right-panel__body">
        {panelTab === "assistant" ? <AssistantPanel /> : mode === "pcb" ? <PcbInspector /> : <Inspector />}
      </div>
    </div>
  );
}
