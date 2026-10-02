import { useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Sheet } from "../../shared/ui/Sheet";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";
import { useSnapshots } from "./useSnapshots";
import "../projects/projects.css";

export function SnapshotsMenu() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { circuit } = useCircuitGraph();
  const { loadCircuit } = useCircuitActions();
  const { snapshots, save, remove } = useSnapshots();
  const empty = circuit.instances.length === 0;

  const take = () => {
    save(name, circuit);
    setName("");
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} title="Save & restore local snapshots (version history)">
        Snapshots
      </Button>
      <Sheet
        open={open}
        title="Snapshots"
        onClose={() => setOpen(false)}
        actions={<span className="sheet__soon">{snapshots.length} saved · local</span>}
      >
        <div className="projects">
          <div className="projects__save">
            <input
              className="projects__name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Snapshot name (optional)"
              aria-label="Snapshot name"
              onKeyDown={(e) => e.key === "Enter" && !empty && take()}
            />
            <Button variant="primary" size="sm" disabled={empty} onClick={take}>
              Save snapshot
            </Button>
          </div>

          {snapshots.length === 0 ? (
            <p className="projects__empty">No snapshots yet — capture the current circuit to roll back to it later.</p>
          ) : (
            <ul className="projects__list">
              {snapshots.map((snap) => (
                <li key={snap.id} className="projects__item">
                  <button type="button" className="projects__open" onClick={() => loadCircuit(snap.circuit)}>
                    <span className="projects__item-name">{snap.name}</span>
                    <span className="projects__item-meta">
                      {snap.circuit.instances.length} parts · {new Date(snap.at).toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="projects__delete"
                    aria-label={`Delete ${snap.name}`}
                    onClick={() => remove(snap.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>
    </>
  );
}
