import { useEffect, useMemo, useState } from "react";
import type { AcResult } from "../../domain";
import { errorMessage, simulationService } from "../../services";
import { formatSI } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Sheet } from "../../shared/ui/Sheet";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { useCatalog } from "../catalog/CatalogContext";
import { toSimulationCircuit } from "../custom/toSimulationCircuit";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import "./ac.css";

const COLORS = ["#38bdf8", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#fb7185"];
const SOURCE_KEYS = new Set(["dc_supply", "battery_lipo"]);

function BodeChart({ result }: { result: AcResult }) {
  const W = 580;
  const padL = 48;
  const padR = 16;
  const magH = 150;
  const phaseH = 110;
  const gap = 34;
  const H = magH + gap + phaseH + 28;
  const freqs = result.freqs;
  if (freqs.length === 0) return null;
  const lo = Math.log10(freqs[0]);
  const hi = Math.log10(freqs[freqs.length - 1]);
  const xAt = (f: number) => padL + ((Math.log10(f) - lo) / (hi - lo || 1)) * (W - padL - padR);

  const allMag = result.series.flatMap((s) => s.magnitude_db).filter(Number.isFinite);
  const magMax = Math.ceil(Math.max(0, ...allMag) / 10) * 10;
  const magMin = Math.max(-100, Math.floor(Math.min(0, ...allMag) / 10) * 10);
  const magY = (db: number) => 8 + magH * (1 - (db - magMin) / (magMax - magMin || 1));
  const phaseTop = magH + gap;
  const phaseY = (deg: number) => phaseTop + phaseH * (1 - (deg + 180) / 360);

  const decades: number[] = [];
  for (let d = Math.floor(lo); d <= Math.ceil(hi); d++) decades.push(d);

  const linePoints = (vals: number[], y: (v: number) => number) =>
    vals
      .map((v, i) => (Number.isFinite(v) ? `${xAt(freqs[i]).toFixed(1)},${y(v).toFixed(1)}` : null))
      .filter((p): p is string => p !== null)
      .join(" ");

  return (
    <svg className="ac-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* decade gridlines */}
      {decades.map((d) => {
        const x = xAt(10 ** d);
        return (
          <g key={d}>
            <line x1={x} y1={8} x2={x} y2={magH + 8} className="ac-grid" />
            <line x1={x} y1={phaseTop} x2={x} y2={phaseTop + phaseH} className="ac-grid" />
            <text x={x} y={H - 6} className="ac-axis" textAnchor="middle">
              {formatSI(10 ** d, "Hz")}
            </text>
          </g>
        );
      })}
      {/* magnitude frame + 0 dB line */}
      <line x1={padL} y1={8} x2={padL} y2={magH + 8} className="ac-axis-line" />
      <line x1={padL} y1={magY(0)} x2={W - padR} y2={magY(0)} className="ac-grid ac-grid--zero" />
      <text x={padL - 6} y={magY(0) + 3} className="ac-axis" textAnchor="end">0 dB</text>
      <text x={padL - 6} y={magY(magMin) + 3} className="ac-axis" textAnchor="end">{magMin}</text>
      {/* phase frame + -45/-90 guides */}
      <line x1={padL} y1={phaseTop} x2={padL} y2={phaseTop + phaseH} className="ac-axis-line" />
      <line x1={padL} y1={phaseY(0)} x2={W - padR} y2={phaseY(0)} className="ac-grid" />
      <text x={padL - 6} y={phaseY(0) + 3} className="ac-axis" textAnchor="end">0°</text>
      <text x={padL - 6} y={phaseY(-90) + 3} className="ac-axis" textAnchor="end">-90°</text>
      <text x={padL - 6} y={phaseY(90) + 3} className="ac-axis" textAnchor="end">90°</text>
      {result.series.map((s, i) => (
        <g key={s.id}>
          <polyline points={linePoints(s.magnitude_db, magY)} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={1.8} />
          <polyline
            points={linePoints(s.phase_deg, phaseY)}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={1.4}
            strokeDasharray="5 3"
          />
        </g>
      ))}
      <text x={padL} y={6} className="ac-title">Gain (dB)</text>
      <text x={padL} y={phaseTop - 6} className="ac-title">Phase (°, dashed)</text>
    </svg>
  );
}

export function AcSheet() {
  const { acOpen, closeAc } = useWorkspaceUi();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();

  const simCircuit = useMemo(() => toSimulationCircuit(circuit, byKey), [circuit, byKey]);
  const hasSource = useMemo(
    () => simCircuit.instances.some((i) => SOURCE_KEYS.has(i.component_key)),
    [simCircuit],
  );

  const [startHz, setStartHz] = useState(10);
  const [stopHz, setStopHz] = useState(1_000_000);
  const [points, setPoints] = useState(60);
  const [result, setResult] = useState<AcResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [simCircuit]);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await simulationService.ac(simCircuit, {
        start_hz: Math.max(0.001, startHz),
        stop_hz: Math.max(startHz * 10, stopHz),
        points: Math.max(2, Math.min(400, points)),
      });
      setResult(res);
    } catch (err) {
      setError(errorMessage(err, "AC analysis failed"));
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Sheet open={acOpen} title="Bode / AC analysis" onClose={closeAc} actions={<span className="sheet__soon">frequency response</span>}>
      {!hasSource ? (
        <EmptyState title="No source to drive">
          AC analysis needs a <code>DC supply</code> (used as a unit AC stimulus) and a{" "}
          <code>voltmeter</code> at the output. Add them, then reopen Bode.
        </EmptyState>
      ) : (
        <div className="ac">
          <div className="ac__controls">
            <label className="ac__field">
              <span>Start (Hz)</span>
              <input type="number" min="0.001" value={startHz} onChange={(e) => setStartHz(Number(e.target.value))} />
            </label>
            <label className="ac__field">
              <span>Stop (Hz)</span>
              <input type="number" min="1" value={stopHz} onChange={(e) => setStopHz(Number(e.target.value))} />
            </label>
            <label className="ac__field">
              <span>Points</span>
              <input type="number" min="2" max="400" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </label>
            <Button variant="primary" size="sm" onClick={() => void run()} disabled={running}>
              {running ? "Running…" : "Run sweep"}
            </Button>
          </div>
          {error && <p className="ac__error">{error}</p>}
          {result && result.series.length > 0 ? (
            <>
              <BodeChart result={result} />
              <div className="ac__legend">
                {result.series.map((s, i) => (
                  <span key={s.id} className="ac__legend-item">
                    <i style={{ background: COLORS[i % COLORS.length] }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            !error && <p className="ac__hint">Set a frequency range and run the sweep to plot the response.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
