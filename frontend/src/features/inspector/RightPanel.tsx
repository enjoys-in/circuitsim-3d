import { useState } from "react";
import { Tabs, type TabItem } from "../../shared/ui/Tabs";
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
  return (
    <div className="right-panel">
      <Tabs items={TABS} active={tab} onChange={setTab} />
      <div className="right-panel__body">
        {tab === "inspect" ? <Inspector /> : <AssistantPanel />}
      </div>
    </div>
  );
}
