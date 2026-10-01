import { useEffect, useState } from "react";
import type { PanZoom } from "./usePanZoom";

export function PcbZoomOverlay({ view }: { view: PanZoom }) {
  const [draft, setDraft] = useState(String(view.zoomPercent));
  useEffect(() => setDraft(String(view.zoomPercent)), [view.zoomPercent]);

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed)) view.setZoomPercent(parsed);
    else setDraft(String(view.zoomPercent));
  };

  return (
    <div className="pcb-zoom">
      <button type="button" onClick={() => view.zoomByCenter(1.15)} aria-label="Zoom out">
        −
      </button>
      <input
        aria-label="PCB zoom percent"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
      />
      <span className="pcb-zoom__unit">%</span>
      <button type="button" onClick={() => view.zoomByCenter(0.87)} aria-label="Zoom in">
        +
      </button>
    </div>
  );
}
