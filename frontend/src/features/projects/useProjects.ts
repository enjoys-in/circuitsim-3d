import { useCallback, useEffect, useState } from "react";
import type { Project } from "../../domain/project";
import { errorMessage, projectsService } from "../../services";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";

export interface ProjectsController {
  projects: Project[];
  currentId: string | null;
  name: string;
  setName: (name: string) => void;
  busy: boolean;
  error: string | null;
  save: () => Promise<void>;
  saveAsCopy: () => Promise<void>;
  open: (project: Project) => void;
  remove: (id: string) => Promise<void>;
  startNew: () => void;
}

export function useProjects(active: boolean): ProjectsController {
  const { circuit } = useCircuitGraph();
  const { loadCircuit } = useCircuitActions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProjects(await projectsService.list());
    } catch (e) {
      setError(errorMessage(e, "Could not load saved projects"));
    }
  }, []);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = currentId
        ? await projectsService.update(currentId, { name, circuit })
        : await projectsService.create({ name, circuit });
      setCurrentId(saved.id);
      await refresh();
    } catch (e) {
      setError(errorMessage(e, "Could not save the project"));
    } finally {
      setBusy(false);
    }
  }, [circuit, currentId, name, refresh]);

  const saveAsCopy = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await projectsService.create({ name, circuit });
      setCurrentId(created.id);
      await refresh();
    } catch (e) {
      setError(errorMessage(e, "Could not save the project"));
    } finally {
      setBusy(false);
    }
  }, [circuit, name, refresh]);

  const open = useCallback(
    (project: Project) => {
      loadCircuit(project.circuit);
      setCurrentId(project.id);
      setName(project.name);
    },
    [loadCircuit],
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await projectsService.remove(id);
        setCurrentId((prev) => (prev === id ? null : prev));
        await refresh();
      } catch (e) {
        setError(errorMessage(e, "Could not delete the project"));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const startNew = useCallback(() => {
    setCurrentId(null);
    setName("Untitled");
  }, []);

  return { projects, currentId, name, setName, busy, error, save, saveAsCopy, open, remove, startNew };
}
