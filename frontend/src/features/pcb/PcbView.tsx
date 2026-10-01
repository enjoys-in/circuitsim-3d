import { useState } from "react";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { EmptyState } from "../../shared/ui/EmptyState";
import { PcbCanvas } from "./canvas/PcbCanvas";
import { Pcb3DView } from "./canvas/Pcb3DView";
import { DrcPanel } from "./DrcPanel";
import { PcbToolbar, type PcbViewMode } from "./PcbToolbar";
import "./pcb.css";

export default function PcbView() {
  const { circuit } = useCircuitGraph();
  const [mode, setMode] = useState<PcbViewMode>("2d");

  if (circuit.instances.length === 0) {
    return (
      <section className="pcb">
        <EmptyState title="No board to lay out">
          Add parts and wire them in the Schematic tab, then come back here to place footprints and route copper.
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="pcb">
      <PcbToolbar mode={mode} onMode={setMode} />
      <div className="pcb__stage">{mode === "2d" ? <PcbCanvas /> : <Pcb3DView />}</div>
      {mode === "2d" && <DrcPanel />}
    </section>
  );
}
