import { useState, type DragEvent } from "react";
import { useCatalog } from "../catalog/CatalogContext";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";
import { EmptyState } from "../../shared/ui/EmptyState";
import { DRAG_MIME } from "../../shared/constants";
import { readPreset } from "../parts/dragPayload";
import type { PcbRenderMode } from "./canvas/Footprint";
import { PcbCanvas } from "./canvas/PcbCanvas";
import { Pcb3DScene } from "./canvas/Pcb3DScene";
import { DrcPanel } from "./DrcPanel";
import { PcbToolbar, type PcbViewMode } from "./PcbToolbar";
import "./pcb.css";

export default function PcbView() {
  const { circuit } = useCircuitGraph();
  const { addPart } = useCircuitActions();
  const { byKey } = useCatalog();
  const [mode, setMode] = useState<PcbViewMode>("2d");
  const [render, setRender] = useState<PcbRenderMode>("wire");

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  if (circuit.instances.length === 0) {
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const def = byKey.get(e.dataTransfer.getData(DRAG_MIME));
      if (!def) return;
      const preset = readPreset(e.dataTransfer);
      addPart(def, { params: preset?.params, label: preset?.name });
    };
    return (
      <section className="pcb" onDrop={onDrop} onDragOver={onDragOver}>
        <EmptyState title="No board to lay out">
          Drag parts straight from the library onto this board to start a PCB from scratch — or build in the
          Schematic tab and use “Convert to PCB”.
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="pcb">
      <PcbToolbar mode={mode} onMode={setMode} render={render} onRender={setRender} />
      <div className="pcb__stage">{mode === "2d" ? <PcbCanvas render={render} /> : <Pcb3DScene />}</div>
      {mode === "2d" && <DrcPanel />}
    </section>
  );
}
