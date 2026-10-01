import { useEffect, useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";

export function ZoomControl() {
  const { zoom } = useViewport();
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow();
  const percent = Math.round(zoom * 100);
  const [draft, setDraft] = useState(String(percent));
  useEffect(() => setDraft(String(percent)), [percent]);

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed)) zoomTo(Math.min(300, Math.max(20, parsed)) / 100, { duration: 150 });
    else setDraft(String(percent));
  };

  return (
    <div className="zoom-control" title="Canvas zoom">
      <button type="button" onClick={() => zoomOut({ duration: 150 })} aria-label="Zoom out">
        −
      </button>
      <input
        aria-label="Zoom percent"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
      />
      <span className="zoom-control__unit">%</span>
      <button type="button" onClick={() => zoomIn({ duration: 150 })} aria-label="Zoom in">
        +
      </button>
      <button type="button" onClick={() => fitView({ duration: 200, padding: 0.2 })} aria-label="Fit view">
        ⤢
      </button>
    </div>
  );
}
