import { usePersistentState } from "../../shared/hooks/usePersistentState";
import type { Circuit } from "../../domain";

export interface Snapshot {
  id: string;
  name: string;
  at: string;
  circuit: Circuit;
}

const LIMIT = 30;

// Local, backend-free version history: named circuit snapshots kept in localStorage.
export function useSnapshots() {
  const [snapshots, setSnapshots] = usePersistentState<Snapshot[]>("circuitsim.snapshots", []);

  const save = (name: string, circuit: Circuit) => {
    const snap: Snapshot = {
      id: `s${Date.now()}`,
      name: name.trim() || new Date().toLocaleString(),
      at: new Date().toISOString(),
      circuit,
    };
    setSnapshots((prev) => [snap, ...prev].slice(0, LIMIT));
  };

  const remove = (id: string) => setSnapshots((prev) => prev.filter((s) => s.id !== id));

  return { snapshots, save, remove };
}
