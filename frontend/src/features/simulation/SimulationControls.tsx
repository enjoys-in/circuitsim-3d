import type { Analysis } from "../../domain";
import { cx } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { ToggleField } from "../../shared/ui/Field";
import { NumberInput } from "../../shared/ui/NumberInput";
import { useSimulation } from "./SimulationContext";

const ANALYSES: { value: Analysis; label: string }[] = [
  { value: "op", label: "DC" },
  { value: "tran", label: "Transient" },
];

export function SimulationControls() {
  const { run, status, live, setLive, options, setOptions } = useSimulation();
  const running = status === "running";

  return (
    <div className="sim-controls">
      <Button variant="primary" onClick={run} disabled={running}>
        {running ? "Simulating…" : "▶ Simulate"}
      </Button>
      <ToggleField label="Live" checked={live} onChange={setLive} />
      <div className="segmented" role="radiogroup" aria-label="Analog analysis">
        {ANALYSES.map((a) => (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={options.analysis === a.value}
            className={cx("segmented__item", options.analysis === a.value && "segmented__item--active")}
            onClick={() => setOptions({ analysis: a.value })}
          >
            {a.label}
          </button>
        ))}
      </div>
      {options.analysis === "tran" && (
        <NumberInput
          label="Span"
          suffix="ms"
          value={Number((options.t_stop * 1000).toPrecision(6))}
          min={0.001}
          max={100000}
          onCommit={(ms) => setOptions({ t_stop: ms / 1000 })}
        />
      )}
      <NumberInput label="Ticks" value={options.ticks} min={1} max={600} onCommit={(ticks) => setOptions({ ticks })} />
      <NumberInput
        label="Tick"
        suffix="ms"
        value={options.tick_ms}
        min={1}
        max={60000}
        onCommit={(tick_ms) => setOptions({ tick_ms })}
      />
    </div>
  );
}
