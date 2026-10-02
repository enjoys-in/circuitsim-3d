import { useEffect, useMemo, useState } from "react";
import type { SweepResult } from "../../domain";
import { errorMessage, simulationService } from "../../services";
import { formatSI } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Sheet } from "../../shared/ui/Sheet";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { useCatalog } from "../catalog/CatalogContext";
import { toSimulationCircuit } from "../custom/toSimulationCircuit";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import "./sweep.css";

const COLORS = ["#38bdf8", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#fb7185"];
const METER_KEYS = new Set(["voltmeter", "ammeter", "led", "output"]);
// params that are numeric but not meaningful to sweep in a DC operating point
const BLOCK = new Set(["value", "initial", "switches", "closed", "pressed", "onboard_led"]);

interface SweepPart {
  id: string;
  label: string;
  params: { name: string; value: number }[];
}

function SweepChart({ result }: { result: SweepResult }) {
  const W = 560;
  const H = 240;
  const padL = 46;
  const padR = 14;
  const padT = 12;
  const padB = 34;
  const xs = result.x;
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const plotH = H - padT - padB;
  const xAt = (x: number) => padL + ((x - xMin) / (xMax - xMin || 1)) * (W - padL - padR);

  return (
    <svg className="sweep-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#243244" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#243244" />
      <text x={padL} y={H - padB + 15} fontSize={9} fill="#8b9bb0" textAnchor="start">
        {formatSI(xMin, result.x_unit)}
      </text>
      <text x={W - padR} y={H - padB + 15} fontSize={9} fill="#8b9bb0" textAnchor="end">
        {formatSI(xMax, result.x_unit)}
      </text>
      <text x={(padL + W - padR) / 2} y={H - 6} fontSize={10} fill="#8b9bb0" textAnchor="middle">
        {result.x_label}
      </text>
      {result.series.map((s, i) => {
        const nums = s.values.filter((v): v is number => v !== null && Number.isFinite(v));
        if (nums.length === 0) return null;
        const vMin = Math.min(...nums);
        const vMax = Math.max(...nums);
        const yAt = (v: number) => padT + plotH * (1 - (vMax === vMin ? 0.5 : (v - vMin) / (vMax - vMin)));
        const points = s.values
          .map((v, j) => (v === null || !Number.isFinite(v) ? null : `${xAt(xs[j])},${yAt(v)}`))
          .filter((p): p is string => p !== null)
          .join(" ");
        return (
          <polyline key={s.id} points={points} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={1.8} />
        );
      })}
    </svg>
  );
}

export function SweepSheet() {
  const { sweepOpen, closeSweep } = useWorkspaceUi();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();

  const simCircuit = useMemo(() => toSimulationCircuit(circuit, byKey), [circuit, byKey]);
  const parts = useMemo<SweepPart[]>(() => {
    const out: SweepPart[] = [];
    for (const inst of simCircuit.instances) {
      const def = byKey.get(inst.component_key);
      const merged = { ...(def?.default_params ?? {}), ...inst.params } as Record<string, unknown>;
      const params = Object.entries(merged)
        .filter(([k, v]) => typeof v === "number" && !BLOCK.has(k))
        .map(([name, v]) => ({ name, value: v as number }));
      if (params.length) out.push({ id: inst.id, label: inst.label || inst.id, params });
    }
    return out;
  }, [simCircuit, byKey]);
  const meterCount = useMemo(
    () => simCircuit.instances.filter((i) => METER_KEYS.has(i.component_key)).length,
    [simCircuit],
  );
  const partsKey = parts.map((p) => p.id).join(",");

  const [instanceId, setInstanceId] = useState("");
  const [param, setParam] = useState("");
  const [start, setStart] = useState(0);
  const [stop, setStop] = useState(10);
  const [steps, setSteps] = useState(21);
  const [result, setResult] = useState<SweepResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const part = parts.find((p) => p.id === instanceId) ?? parts[0];

  // Default the target + range from the first sweepable part when the circuit changes.
  useEffect(() => {
    const first = parts[0];
    if (!first) {
      setInstanceId("");
      setParam("");
      return;
    }
    setInstanceId(first.id);
    const p = first.params[0];
    setParam(p.name);
    setStart(0);
    setStop(p.value > 0 ? Number((p.value * 2).toPrecision(3)) : 10);
    setResult(null);
    setError(null);
  }, [partsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseInstance = (id: string) => {
    setInstanceId(id);
    const p = parts.find((x) => x.id === id)?.params[0];
    if (p) {
      setParam(p.name);
      setStart(0);
      setStop(p.value > 0 ? Number((p.value * 2).toPrecision(3)) : 10);
    }
    setResult(null);
  };

  const chooseParam = (name: string) => {
    setParam(name);
    const v = part?.params.find((x) => x.name === name)?.value ?? 0;
    setStart(0);
    setStop(v > 0 ? Number((v * 2).toPrecision(3)) : 10);
    setResult(null);
  };

  const run = async () => {
    if (!instanceId || !param) return;
    setRunning(true);
    setError(null);
    try {
      const res = await simulationService.sweep(simCircuit, {
        instance: instanceId,
        param,
        start,
        stop,
        steps: Math.max(2, Math.min(200, steps)),
      });
      setResult(res);
    } catch (err) {
      setError(errorMessage(err, "Sweep failed"));
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Sheet
      open={sweepOpen}
      title="Sweep"
      onClose={closeSweep}
      actions={<span className="sheet__soon">DC / parameter sweep</span>}
    >
      {parts.length === 0 ? (
        <EmptyState title="Nothing to sweep">
          Add a part with a numeric value (a supply voltage, a resistor…) and a{" "}
          <code>voltmeter</code> or <code>ammeter</code> to watch, then reopen Sweep.
        </EmptyState>
      ) : (
        <div className="sweep">
          <div className="sweep__controls">
            <label className="sweep__field">
              <span>Sweep</span>
              <select value={instanceId} onChange={(e) => chooseInstance(e.target.value)}>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sweep__field">
              <span>Parameter</span>
              <select value={param} onChange={(e) => chooseParam(e.target.value)}>
                {part?.params.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="sweep__field sweep__field--num">
              <span>From</span>
              <input type="number" value={start} onChange={(e) => setStart(Number(e.target.value))} />
            </label>
            <label className="sweep__field sweep__field--num">
              <span>To</span>
              <input type="number" value={stop} onChange={(e) => setStop(Number(e.target.value))} />
            </label>
            <label className="sweep__field sweep__field--num">
              <span>Steps</span>
              <input
                type="number"
                min={2}
                max={200}
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value) || 2)}
              />
            </label>
            <Button size="sm" variant="primary" onClick={() => void run()} disabled={running || !param}>
              {running ? "Running…" : "Run sweep"}
            </Button>
          </div>

          {meterCount === 0 && (
            <p className="sweep__hint">
              No <code>voltmeter</code> / <code>ammeter</code> in the circuit — add one where you want to
              measure, then run the sweep.
            </p>
          )}
          {error && <p className="sweep__error">{error}</p>}

          {result && result.series.length > 0 && (
            <>
              <SweepChart result={result} />
              <div className="sweep__legend">
                {result.series.map((s, i) => {
                  const nums = s.values.filter((v): v is number => v !== null && Number.isFinite(v));
                  const lo = nums.length ? Math.min(...nums) : 0;
                  const hi = nums.length ? Math.max(...nums) : 0;
                  return (
                    <span key={s.id} className="sweep__legend-item">
                      <span className="sweep__swatch" style={{ background: COLORS[i % COLORS.length] }} />
                      {s.label}: {formatSI(lo, s.unit)} … {formatSI(hi, s.unit)}
                    </span>
                  );
                })}
              </div>
            </>
          )}
          {result && result.series.length === 0 && (
            <p className="sweep__hint">The sweep ran, but there were no meters to plot.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
