import { Sheet } from "../../shared/ui/Sheet";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import { LEVEL_GROUPS } from "./levels";
import { useExampleLoader } from "./useExampleLoader";
import "./levels.css";

export function LevelGallery() {
  const { examplesOpen, closeExamples } = useWorkspaceUi();
  const loadExample = useExampleLoader();

  const load = (id: string) => {
    loadExample(id);
    closeExamples();
  };

  return (
    <Sheet open={examplesOpen} title="Projects by level" onClose={closeExamples}>
      <div className="levels">
        {LEVEL_GROUPS.map((group) => (
          <section key={group.level} className="levels__group">
            <header className="levels__head">
              <h3>{group.level}</h3>
              <p>{group.blurb}</p>
            </header>
            <div className="levels__grid">
              {group.items.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  className="levels__card"
                  onClick={() => load(example.id)}
                >
                  <span className="levels__card-title">{example.title}</span>
                  <span className="levels__card-cat">{example.category}</span>
                  <span className="levels__card-desc">{example.description}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
