import { useState } from "react";
import { Tabs, type TabItem } from "../../shared/ui/Tabs";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import { AssistantPanel } from "../assistant/AssistantPanel";
import Inspector from "./Inspector";
import "./inspector.css";

type PanelTab = "inspect" | "assistant";

const TABS: TabItem<PanelTab>[] = [
  { key: "inspect", label: "Inspector" },
  { key: "assistant", label: "Assistant", badge: "AI" },
];

export default function RightPanel() {
  const [tab, setTab] = useState<PanelTab>("inspect");
  const { togglePanel } = useWorkspaceUi();
  return (
    <div className="right-panel">
      <Tabs
        items={TABS}
        active={tab}
        onChange={setTab}
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
        {tab === "inspect" ? <Inspector /> : <AssistantPanel />}
      </div>
    </div>
  );
}
