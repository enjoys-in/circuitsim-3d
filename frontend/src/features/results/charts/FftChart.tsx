import { useMemo } from "react";
import type { Series } from "../../../domain";
import { formatSI } from "../../../shared/lib/format";
import { computeSpectrum } from "./fft";

interface Props {
  time: number[];
  timeUnit: "s" | "tick";
  series: Series[];
  colorOf: (id: string) => string;
}

const W = 600;
const H = 220;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 12;
const PAD_B = 28;

export function FftChart({ time, timeUnit, series, colorOf }: Props) {
  const dt = time.length > 1 ? time[1] - time[0] : 1;
  const unit = timeUnit === "s" ? "Hz" : "/tick";
  const spectra = useMemo(
    () => series.map((s) => ({ id: s.id, label: s.label, ...computeSpectrum(s.values, dt) })),
    [series, dt],
  );

  const fMax = Math.max(1e-9, ...spectra.flatMap((s) => s.freqs));
  const mMax = Math.max(1e-9, ...spectra.flatMap((s) => s.mags));
  const xAt = (f: number) => PAD_L + (f / fMax) * (W - PAD_L - PAD_R);
  const yAt = (m: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - m / mMax);

  if (spectra.every((s) => s.freqs.length === 0)) {
    return <p className="waveforms__hint">Run a transient analysis to compute a spectrum.</p>;
  }

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="#243244" />
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#243244" />
      <text x={PAD_L - 6} y={PAD_T + 6} className="chart__tick" textAnchor="end">
        {Number(mMax.toPrecision(3))}
      </text>
      <text x={PAD_L} y={H - 8} className="chart__tick" textAnchor="start">0</text>
      <text x={W - PAD_R} y={H - 8} className="chart__tick" textAnchor="end">
        {formatSI(fMax, unit)}
      </text>
      {spectra.map((s) => (
        <polyline
          key={s.id}
          points={s.freqs.map((f, i) => `${xAt(f).toFixed(1)},${yAt(s.mags[i]).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={colorOf(s.id)}
          strokeWidth={1.6}
        />
      ))}
    </svg>
  );
}
