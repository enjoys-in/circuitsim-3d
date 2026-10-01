import { useMemo } from "react";
import type { Series } from "../../../domain";
import { useElementWidth } from "../../../shared/hooks/useElementWidth";
import { linearScale, niceTicks } from "./scale";
import { formatTime } from "./timeFormat";
import { invertScale, useCrosshair } from "./useCrosshair";

interface Props {
  time: number[];
  timeUnit: "s" | "tick";
  series: Series[];
  colorOf: (id: string) => string;
  cursor?: number;
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

export function TimingDiagram({ time, timeUnit, series, colorOf, cursor }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const plotW = width - LABEL_W - MARGIN.right;
  const height = MARGIN.top + series.length * (LANE + GAP) + MARGIN.bottom;
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

  return (
    <div ref={ref} className="chart">
      <svg width={width} height={height} role="img" aria-label={`${series.length} digital signals`}>
        <g transform={`translate(${LABEL_W},${MARGIN.top})`}>
          {series.map((s, lane) => {
            const top = lane * (LANE + GAP);
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
              height={series.length * (LANE + GAP)}
              className="chart__band"
            />
          )}
          <rect
            width={plotW}
            height={series.length * (LANE + GAP)}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          />
        </g>
      </svg>
      {index !== null && (
        <div className="chart__tooltip" style={{ left: Math.min(LABEL_W + edges[index] + 12, width - 180) }}>
          <strong>{formatTime(time[index], timeUnit)}</strong>
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
