import { useEffect, useState } from "react";
import type { Series, SimulationOutput } from "../../domain";
import { errorMessage, simulationService } from "../../services";
import { formatSI } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Sheet } from "../../shared/ui/Sheet";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { useCatalog } from "../catalog/CatalogContext";
import { toSimulationCircuit } from "../custom/toSimulationCircuit";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import "./scope.css";

const COLORS = ["#fbbf24", "#38bdf8", "#34d399", "#f472b6", "#a78bfa", "#fb7185", "#22d3ee", "#f97316"];
const W = 680;
const H = 360;
const PAD = 12;
const COLS = 10;
const ROWS = 8;

function finite(v: number | null): v is number {
  return v !== null && Number.isFinite(v);
}

function ScopeScreen({
  time,
  series,
  hidden,
}: {
  time: number[];
  series: Series[];
  hidden: Set<string>;
}) {
  const gw = W - 2 * PAD;
  const gh = H - 2 * PAD;
  const shown = series.filter((s) => !hidden.has(s.id));
  const nums = shown.flatMap((s) => s.values.filter(finite));
  let vMin = nums.length ? Math.min(...nums) : -1;
  let vMax = nums.length ? Math.max(...nums) : 1;
  if (vMax - vMin < 1e-9) {
    vMin -= 1;
    vMax += 1;
  }
  const marginV = (vMax - vMin) * 0.08;
  vMin -= marginV;
  vMax += marginV;
  const tMin = time[0] ?? 0;
  const tMax = time[time.length - 1] ?? 1;
  const xAt = (t: number) => PAD + (tMax === tMin ? 0 : (t - tMin) / (tMax - tMin)) * gw;
  const yAt = (v: number) => PAD + (1 - (v - vMin) / (vMax - vMin)) * gh;

  return (
    <svg className="scope-screen" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <rect x={PAD} y={PAD} width={gw} height={gh} fill="#04120e" />
      {Array.from({ length: COLS + 1 }, (_, i) => {
        const x = PAD + (gw * i) / COLS;
        return (
          <line key={`v${i}`} x1={x} y1={PAD} x2={x} y2={PAD + gh} stroke={i === COLS / 2 ? "#1f6f52" : "#0d3324"} strokeWidth={i === COLS / 2 ? 1 : 0.6} />
        );
      })}
      {Array.from({ length: ROWS + 1 }, (_, i) => {
        const y = PAD + (gh * i) / ROWS;
        return (
          <line key={`h${i}`} x1={PAD} y1={y} x2={PAD + gw} y2={y} stroke={i === ROWS / 2 ? "#1f6f52" : "#0d3324"} strokeWidth={i === ROWS / 2 ? 1 : 0.6} />
        );
      })}
      {shown.map((s) => {
        const pts = s.values
          .map((v, j) => (finite(v) ? `${xAt(time[j])},${yAt(v)}` : null))
          .filter((p): p is string => p !== null)
          .join(" ");
        return <polyline key={s.id} points={pts} fill="none" stroke={COLORS[series.indexOf(s) % COLORS.length]} strokeWidth={1.6} />;
      })}
      <text x={PAD + 4} y={PAD + 12} fontSize={9} fill="#6ee7b7" fontFamily="monospace">{formatSI(vMax, "V")}</text>
      <text x={PAD + 4} y={PAD + gh - 4} fontSize={9} fill="#6ee7b7" fontFamily="monospace">{formatSI(vMin, "V")}</text>
      <text x={PAD + gw - 4} y={PAD + gh - 4} fontSize={9} fill="#6ee7b7" fontFamily="monospace" textAnchor="end">{formatSI(tMax, "s")}</text>
    </svg>
  );
}

export function ScopeSheet() {
  const { scopeOpen, closeScope } = useWorkspaceUi();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();

  const [windowMs, setWindowMs] = useState(10);
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const capture = async () => {
    const sim = toSimulationCircuit(circuit, byKey);
    if (sim.instances.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      const res = await simulationService.run(sim, {
        analysis: "tran",
        t_stop: Math.max(0.0001, windowMs / 1000),
        steps: 240,
        ticks: 20,
        tick_ms: 500,
      });
      setResult(res.results);
    } catch (err) {
      setError(errorMessage(err, "Capture failed"));
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  // Auto-capture a trace when the scope is opened.
  useEffect(() => {
    if (scopeOpen) void capture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeOpen]);

  const analog = (result?.series ?? []).filter((s) => s.kind === "analog");
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Sheet
      open={scopeOpen}
      title="Oscilloscope"
      onClose={closeScope}
      actions={<span className="sheet__soon">transient capture</span>}
    >
      {circuit.instances.length === 0 ? (
        <EmptyState title="Nothing to capture">Build a circuit, then open the scope.</EmptyState>
      ) : (
        <div className="scope">
          <div className="scope__bar">
            <label className="scope__field">
              Time window
              <input
                type="number"
                min={0.1}
                step={1}
                value={windowMs}
                onChange={(e) => setWindowMs(Math.max(0.1, Number(e.target.value) || 0.1))}
              />
              <span>ms</span>
            </label>
            <span className="scope__div">{formatSI(windowMs / 1000 / COLS, "s")}/div</span>
            <Button size="sm" variant="primary" onClick={() => void capture()} disabled={running}>
              {running ? "Capturing…" : "Capture"}
            </Button>
          </div>

          {error && <p className="scope__error">{error}</p>}

          {result && analog.length > 0 ? (
            <>
              <ScopeScreen time={result.time} series={analog} hidden={hidden} />
              <div className="scope__channels">
                {analog.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`scope__ch ${hidden.has(s.id) ? "scope__ch--off" : ""}`}
                    onClick={() => toggle(s.id)}
                    title="Toggle channel"
                  >
                    <span className="scope__swatch" style={{ background: COLORS[result.series.indexOf(s) % COLORS.length] }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            !running && (
              <p className="scope__hint">
                No analog voltages to show. The scope captures node voltages over time — add reactive
                parts (a capacitor, a clock-driven source) or use the Waveforms tab for digital timing.
              </p>
            )
          )}
        </div>
      )}
    </Sheet>
  );
}
