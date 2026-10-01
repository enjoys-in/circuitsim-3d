import { useMemo } from "react";
import type { Series } from "../../../domain";
import { formatSI } from "../../../shared/lib/format";
import { useElementWidth } from "../../../shared/hooks/useElementWidth";
import { extent, linearScale, niceTicks } from "./scale";
import { formatTime } from "./timeFormat";
import { invertScale, useCrosshair } from "./useCrosshair";

interface Props {
  time: number[];
  timeUnit: "s" | "tick";
  series: Series[];
  colorOf: (id: string) => string;
  cursor?: number;
}

const HEIGHT = 190;
const MARGIN = { top: 12, right: 96, bottom: 24, left: 52 };
const DIRECT_LABEL_LIMIT = 4;
const DIRECT_LABEL_CHARS = 13;

const LABEL_GAP = 12;

function spreadLabels(items: { id: string; y: number }[], bottom: number): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  sorted.forEach((item, i) => {
    if (i > 0) item.y = Math.max(item.y, sorted[i - 1].y + LABEL_GAP);
  });
  const overflow = (sorted[sorted.length - 1]?.y ?? 0) - bottom;
  return new Map(sorted.map((item) => [item.id, overflow > 0 ? item.y - overflow : item.y]));
}

function shorten(label: string): string {
  return label.length > DIRECT_LABEL_CHARS ? `${label.slice(0, DIRECT_LABEL_CHARS - 1)}…` : label;
}

function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let path = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    path += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return path;
}

export function AnalogChart({ time, timeUnit, series, colorOf, cursor }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const unit = series[0]?.unit ?? "";

  const xDomain = useMemo<[number, number]>(() => [time[0] ?? 0, time[time.length - 1] ?? 1], [time]);
  const yDomain = useMemo(
    () => extent(series.flatMap((s) => s.values.filter((v): v is number => v !== null))),
    [series],
  );
  const x = linearScale(xDomain, [0, plotW]);
  const y = linearScale(yDomain, [plotH, 0]);
  const invert = useMemo(() => invertScale(xDomain, plotW), [xDomain, plotW]);
  const { index, onPointerMove, onPointerLeave } = useCrosshair(time, invert);
  const shown = index ?? cursor ?? null;
  const directLabels = spreadLabels(
    series.flatMap((s) => {
      const last = [...s.values].reverse().find((v): v is number => v !== null);
      return last === undefined ? [] : [{ id: s.id, y: y(last) }];
    }),
    plotH,
  );

  return (
    <div ref={ref} className="chart">
      <svg width={width} height={HEIGHT} role="img" aria-label={`${series.length} analog series over time`}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {niceTicks(yDomain).map((tick) => (
            <g key={tick}>
              <line x1={0} x2={plotW} y1={y(tick)} y2={y(tick)} className="chart__grid" />
              <text x={-8} y={y(tick) + 3} className="chart__tick" textAnchor="end">
                {formatSI(tick, unit, 3)}
              </text>
            </g>
          ))}
          {niceTicks(xDomain, 6).map((tick) => (
            <text key={tick} x={x(tick)} y={plotH + 16} className="chart__tick" textAnchor="middle">
              {formatTime(tick, timeUnit)}
            </text>
          ))}
          <line x1={0} x2={plotW} y1={plotH} y2={plotH} className="chart__axis" />
          {series.map((s) => (
            <path
              key={s.id}
              d={linePath(s.values, (i) => x(time[i]), y)}
              className="chart__line"
              stroke={colorOf(s.id)}
            />
          ))}
          {series.length <= DIRECT_LABEL_LIMIT &&
            [...directLabels.entries()].map(([id, labelY]) => (
              <text key={id} x={plotW + 6} y={labelY + 3} className="chart__direct">
                <title>{series.find((s) => s.id === id)?.label}</title>
                {shorten(series.find((s) => s.id === id)?.label ?? id)}
              </text>
            ))}
          {shown !== null && time[shown] !== undefined && (
            <g>
              <line x1={x(time[shown])} x2={x(time[shown])} y1={0} y2={plotH} className="chart__crosshair" />
              {series.map((s) =>
                s.values[shown] === null ? null : (
                  <circle
                    key={s.id}
                    cx={x(time[shown])}
                    cy={y(s.values[shown] as number)}
                    r={4}
                    fill={colorOf(s.id)}
                    className="chart__dot"
                  />
                ),
              )}
            </g>
          )}
          <rect
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          />
        </g>
      </svg>
      {index !== null && (
        <div className="chart__tooltip" style={{ left: Math.min(MARGIN.left + x(time[index]) + 12, width - 180) }}>
          <strong>{formatTime(time[index], timeUnit)}</strong>
          {series.map((s) => (
            <span key={s.id}>
              <i style={{ background: colorOf(s.id) }} />
              {s.label}
              <b>{s.values[index] === null ? "—" : formatSI(s.values[index] as number, s.unit)}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
