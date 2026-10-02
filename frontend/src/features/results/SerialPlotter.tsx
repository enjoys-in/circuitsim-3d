import { useMemo } from "react";
import type { LogEntry } from "../../domain";
import { EmptyState } from "../../shared/ui/EmptyState";

interface PlotSeries {
  key: string;
  points: { t: number; v: number }[];
}

const COLORS = ["#38bdf8", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#f59e0b"];

// Pull plottable numbers out of serial text: "temp=23.5 hum=40" -> named series;
// otherwise bare numbers "23.5 40" -> ch0, ch1… by position (like Arduino's plotter).
export function parseSerial(log: LogEntry[]): PlotSeries[] {
  const map = new Map<string, { t: number; v: number }[]>();
  const named = /([A-Za-z_]\w*)\s*[:=]\s*(-?\d+(?:\.\d+)?)/g;
  const push = (key: string, t: number, v: number) => {
    const list = map.get(key) ?? [];
    list.push({ t, v });
    map.set(key, list);
  };
  for (const entry of log) {
    let matched = false;
    named.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = named.exec(entry.text)) !== null) {
      matched = true;
      push(m[1], entry.t, Number(m[2]));
    }
    if (!matched) {
      const nums = entry.text.match(/-?\d+(?:\.\d+)?/g);
      nums?.forEach((n, i) => push(`ch${i}`, entry.t, Number(n)));
    }
  }
  return [...map.entries()].map(([key, points]) => ({ key, points }));
}

export function SerialPlotter({ log }: { log: LogEntry[] }) {
  const series = useMemo(() => parseSerial(log), [log]);
  const stats = useMemo(() => {
    const pts = series.flatMap((s) => s.points);
    const ts = pts.map((p) => p.t);
    const vs = pts.map((p) => p.v);
    return {
      tMin: Math.min(...ts, 0),
      tMax: Math.max(...ts, 1),
      vMin: Math.min(...vs, 0),
      vMax: Math.max(...vs, 1),
    };
  }, [series]);

  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return <EmptyState title="No numbers to plot">Print numbers (e.g. print(temp)) from firmware to graph them here.</EmptyState>;
  }

  const W = 640;
  const H = 220;
  const padL = 44;
  const padR = 14;
  const padT = 12;
  const padB = 26;
  const { tMin, tMax, vMin, vMax } = stats;
  const span = vMax - vMin || 1;
  const xAt = (t: number) => padL + ((t - tMin) / (tMax - tMin || 1)) * (W - padL - padR);
  const yAt = (v: number) => padT + (H - padT - padB) * (1 - (v - vMin) / span);

  return (
    <div className="serial-plot">
      <svg className="serial-plot__chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#243244" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#243244" />
        <text x={padL - 6} y={padT + 6} className="serial-plot__axis" textAnchor="end">
          {Number(vMax.toPrecision(3))}
        </text>
        <text x={padL - 6} y={H - padB} className="serial-plot__axis" textAnchor="end">
          {Number(vMin.toPrecision(3))}
        </text>
        {series.map((s, i) => (
          <polyline
            key={s.key}
            points={s.points.map((p) => `${xAt(p.t).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={1.6}
          />
        ))}
      </svg>
      <div className="serial-plot__legend">
        {series.map((s, i) => (
          <span key={s.key} className="serial-plot__item">
            <i style={{ background: COLORS[i % COLORS.length] }} />
            {s.key}
            <b>{s.points.length ? Number(s.points[s.points.length - 1].v.toPrecision(4)) : "—"}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
