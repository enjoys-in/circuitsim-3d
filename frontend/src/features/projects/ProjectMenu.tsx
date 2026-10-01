import { useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Sheet } from "../../shared/ui/Sheet";
import { useProjects } from "./useProjects";
import "./projects.css";

export function ProjectMenu() {
  const [open, setOpen] = useState(false);
  const p = useProjects(open);
  const canSave = !p.busy && p.name.trim().length > 0;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} title="Save & open projects">
        Projects
      </Button>
      <Sheet
        open={open}
        title="Projects"
        onClose={() => setOpen(false)}
        actions={p.currentId ? <span className="sheet__soon">Saved</span> : null}
      >
        <div className="projects">
          <div className="projects__save">
            <input
              className="projects__name"
              value={p.name}
              onChange={(e) => p.setName(e.target.value)}
              placeholder="Project name"
              aria-label="Project name"
            />
            <Button variant="primary" size="sm" disabled={!canSave} onClick={() => void p.save()}>
              {p.currentId ? "Save" : "Save new"}
            </Button>
            {p.currentId && (
              <Button size="sm" disabled={!canSave} onClick={() => void p.saveAsCopy()}>
                Save as copy
              </Button>
            )}
            <Button size="sm" onClick={p.startNew} title="Detach from the current saved project">
              New
            </Button>
          </div>

          {p.error && <p className="projects__error">{p.error}</p>}

          {p.projects.length === 0 ? (
            <p className="projects__empty">No saved projects yet — name your circuit and hit Save.</p>
          ) : (
            <ul className="projects__list">
              {p.projects.map((project) => (
                <li
                  key={project.id}
                  className={
                    project.id === p.currentId ? "projects__item projects__item--active" : "projects__item"
                  }
                >
                  <button type="button" className="projects__open" onClick={() => p.open(project)}>
                    <span className="projects__item-name">{project.name}</span>
                    <span className="projects__item-meta">
                      {project.circuit.instances.length} parts · {new Date(project.updated_at).toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="projects__delete"
                    aria-label={`Delete ${project.name}`}
                    disabled={p.busy}
                    onClick={() => void p.remove(project.id)}
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
