import { cx } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { EXAMPLE_GROUPS } from "../examples/examples";
import { useExampleLoader } from "../examples/useExampleLoader";
import { ExportMenu } from "../export/ExportMenu";
import { ProjectMenu } from "../projects/ProjectMenu";
import { SimulationControls } from "../simulation/SimulationControls";
import { useSimulation } from "../simulation/SimulationContext";
import { SoundToggle } from "../sound/SoundToggle";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import { useCircuitActions } from "./CircuitGraphContext";
import { ZoomControl } from "./ZoomControl";

function StatusBadge() {
  const { status, result, stale, error } = useSimulation();
  const tone = error ? "error" : status === "running" ? "busy" : stale ? "stale" : result ? "ok" : "idle";
  const text = error
    ? "Error"
    : status === "running"
      ? "Running"
      : result
        ? `${result.engine} · ${result.analysis}${stale ? " · outdated" : ""}`
        : "Idle";
  return <span className={cx("status-badge", `status-badge--${tone}`)}>{text}</span>;
}

export function BoardToolbar() {
  const loadExample = useExampleLoader();
  const { clear } = useCircuitActions();
  const { openCode } = useWorkspaceUi();

  return (
    <div className="board-toolbar">
      <SimulationControls />
      <div className="board-toolbar__end">
        <ZoomControl />
        <StatusBadge />
        <ProjectMenu />
        <ExportMenu />
        <select
          className="board-toolbar__examples"
          value=""
          aria-label="Load example"
          onChange={(e) => loadExample(e.target.value)}
        >
          <option value="" disabled>
            Examples…
          </option>
          {EXAMPLE_GROUPS.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.items.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <Button size="sm" onClick={openCode} title="Firmware code & flash">
          {"</>"} Code
        </Button>
        <SoundToggle />
        <Button size="sm" onClick={clear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
