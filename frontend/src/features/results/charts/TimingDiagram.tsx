import { useMemo } from "react";
import type { Series } from "../../../domain";
import { useElementWidth } from "../../../shared/hooks/useElementWidth";
import type { Bus } from "./buses";
import { linearScale, niceTicks } from "./scale";
import { formatTime } from "./timeFormat";
import { invertScale, useCrosshair } from "./useCrosshair";

interface Props {
  time: number[];
  timeUnit: "s" | "tick";
  series: Series[];
  colorOf: (id: string) => string;
  cursor?: number;
  buses?: Bus[];
}

const LANE = 24;
const GAP = 8;
const LABEL_W = 132;
const MARGIN = { top: 8, right: 16, bottom: 22 };

function squareWave(values: (number | null)[], edges: number[], y: (v: number) => number): string {
  let path = "";
  values.forEach((v, i) => {
    if (v === null) return;
    const level = y(v ? 1 : 0);
    path += `${path ? "L" : "M"}${edges[i].toFixed(1)},${level.toFixed(1)}H${edges[i + 1].toFixed(1)}`;
  });
  return path;
}

interface Run {
  x0: number;
  x1: number;
  value: number;
}

// Collapse a bus's per-step values into constant-value runs so each stable window is
// drawn once as a hex-labelled segment (the classic logic-analyzer bus look).
function busRuns(values: (number | null)[], edges: number[]): Run[] {
  const runs: Run[] = [];
  let start = -1;
  for (let i = 0; i <= values.length; i++) {
    const v = i < values.length ? values[i] : null;
    const prev = start >= 0 ? values[start] : null;
    if (start >= 0 && (v === null || v !== prev)) {
      if (prev !== null) runs.push({ x0: edges[start], x1: edges[i], value: prev });
      start = -1;
    }
    if (v !== null && start < 0) start = i;
  }
  return runs;
}

export function TimingDiagram({ time, timeUnit, series, colorOf, cursor, buses = [] }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const plotW = width - LABEL_W - MARGIN.right;
  const laneCount = buses.length + series.length;
  const height = MARGIN.top + laneCount * (LANE + GAP) + MARGIN.bottom;
  const lanesHeight = laneCount * (LANE + GAP);
  const step = time.length > 1 ? time[1] - time[0] : 1;
  const xDomain = useMemo<[number, number]>(
    () => [time[0] ?? 0, (time[time.length - 1] ?? 0) + step],
    [time, step],
  );
  const x = linearScale(xDomain, [0, plotW]);
  const edges = [...time.map(x), x(xDomain[1])];
  const invert = useMemo(() => {
    const raw = invertScale(xDomain, plotW);
    return (px: number) => raw(px) - step / 2;
  }, [xDomain, plotW, step]);
  const { index, onPointerMove, onPointerLeave } = useCrosshair(time, invert);
  const shown = index ?? cursor ?? null;
  const hex = (v: number) => v.toString(16).toUpperCase();

  return (
    <div ref={ref} className="chart">
      <svg width={width} height={height} role="img" aria-label={`${laneCount} digital signals`}>
        <g transform={`translate(${LABEL_W},${MARGIN.top})`}>
          {buses.map((bus, i) => {
            const top = i * (LANE + GAP);
            const yTop = top + 3;
            const yBot = top + LANE;
            const color = colorOf(bus.members[0].id);
            const runs = busRuns(bus.values, edges);
            const value = shown === null ? null : bus.values[shown];
            return (
              <g key={`bus-${bus.base}`}>
                <text x={-10} y={top + LANE / 2 + 4} className="chart__lane-label" textAnchor="end">
                  {bus.base}[{bus.members.length - 1}:0]
                </text>
                <line x1={0} x2={plotW} y1={yTop} y2={yTop} className="chart__bus-rail" stroke={color} />
                <line x1={0} x2={plotW} y1={yBot} y2={yBot} className="chart__bus-rail" stroke={color} />
                {runs.map((run, r) => (
                  <g key={r}>
                    {r > 0 && (
                      <line x1={run.x0} x2={run.x0} y1={yTop} y2={yBot} className="chart__bus-rail" stroke={color} />
                    )}
                    {run.x1 - run.x0 > 14 && (
                      <text x={(run.x0 + run.x1) / 2} y={top + LANE / 2 + 4} className="chart__tick" textAnchor="middle">
                        {hex(run.value)}
                      </text>
                    )}
                  </g>
                ))}
                {value !== null && value !== undefined && (
                  <text x={plotW + 4} y={top + LANE / 2 + 4} className="chart__tick">
                    {hex(value)}
                  </text>
                )}
              </g>
            );
          })}
          {series.map((s, j) => {
            const top = (buses.length + j) * (LANE + GAP);
            const y = linearScale([0, 1], [top + LANE, top + 3]);
            const value = shown === null ? null : s.values[shown];
            return (
              <g key={s.id}>
                <text x={-10} y={top + LANE / 2 + 4} className="chart__lane-label" textAnchor="end">
                  {s.label}
                </text>
                <line x1={0} x2={plotW} y1={top + LANE} y2={top + LANE} className="chart__grid" />
                <path d={squareWave(s.values, edges, y)} className="chart__line" stroke={colorOf(s.id)} />
                {value !== null && value !== undefined && (
                  <text x={plotW + 4} y={top + LANE / 2 + 4} className="chart__tick">
                    {value}
                  </text>
                )}
              </g>
            );
          })}
          {niceTicks(xDomain, 8).map((tick) => (
            <text key={tick} x={x(tick)} y={height - MARGIN.top - 6} className="chart__tick" textAnchor="middle">
              {formatTime(tick, timeUnit)}
            </text>
          ))}
          {shown !== null && time[shown] !== undefined && (
            <rect
              x={edges[shown]}
              width={Math.max(edges[shown + 1] - edges[shown], 1)}
              y={0}
              height={lanesHeight}
              className="chart__band"
            />
          )}
          <rect
            width={plotW}
            height={lanesHeight}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          />
        </g>
      </svg>
      {index !== null && (
        <div className="chart__tooltip" style={{ left: Math.min(LABEL_W + edges[index] + 12, width - 180) }}>
          <strong>{formatTime(time[index], timeUnit)}</strong>
          {buses.map((bus) => (
            <span key={`bus-${bus.base}`}>
              <i style={{ background: colorOf(bus.members[0].id) }} />
              {bus.base}
              <b>
                {bus.values[index] === null || bus.values[index] === undefined
                  ? "—"
                  : `0x${hex(bus.values[index] as number)}`}
              </b>
            </span>
          ))}
          {series.map((s) => (
            <span key={s.id}>
              <i style={{ background: colorOf(s.id) }} />
              {s.label}
              <b>{s.values[index] ?? "—"}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
