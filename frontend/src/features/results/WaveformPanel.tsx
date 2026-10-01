import { useMemo, useState } from "react";
import type { Series, SimulationOutput } from "../../domain";
import { cx } from "../../shared/lib/format";
import { EmptyState } from "../../shared/ui/EmptyState";
import { AnalogChart } from "./charts/AnalogChart";
import { MAX_SERIES, SERIES_COLORS } from "./charts/palette";
import { SeriesTable } from "./charts/SeriesTable";
import { TimingDiagram } from "./charts/TimingDiagram";

interface Props {
  result: SimulationOutput;
  cursor?: number;
}

function groupByUnit(series: Series[]): [string, Series[]][] {
  const groups = new Map<string, Series[]>();
  for (const s of series) groups.set(s.unit, [...(groups.get(s.unit) ?? []), s]);
  return [...groups.entries()];
}

export default function WaveformPanel({ result, cursor }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"chart" | "table">("chart");
  const all = result.series;
  const colored = all.slice(0, MAX_SERIES);
  const colorOf = useMemo(() => {
    const map = new Map(colored.map((s, i) => [s.id, SERIES_COLORS[i]]));
    return (id: string) => map.get(id) ?? "#94a3b8";
  }, [colored]);

  if (all.length === 0) {
    return <EmptyState title="No waveforms">Use a transient analysis, a clock, or an MCU board to record signals over time.</EmptyState>;
  }

  const visible = colored.filter((s) => !hidden.has(s.id));
  const digital = visible.filter((s) => s.kind === "digital");
  const analogGroups = groupByUnit(visible.filter((s) => s.kind === "analog"));
  const cursorIndex = cursor !== undefined && result.frames.length === result.time.length ? cursor : undefined;
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="waveforms">
      <div className="waveforms__bar">
        <div className="legend" role="list">
          {colored.map((s) => (
            <button
              key={s.id}
              type="button"
              role="listitem"
              className={cx("legend__item", hidden.has(s.id) && "legend__item--off")}
              onClick={() => toggle(s.id)}
            >
              <i style={{ background: colorOf(s.id) }} />
              {s.label}
            </button>
          ))}
          {all.length > MAX_SERIES && <span className="legend__more">+{all.length - MAX_SERIES} more in table</span>}
        </div>
        <div className="segmented">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={cx("segmented__item", view === v && "segmented__item--active")}
              onClick={() => setView(v)}
            >
              {v === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>
      {view === "table" ? (
        <SeriesTable time={result.time} timeUnit={result.time_unit} series={all} />
      ) : (
        <>
          {analogGroups.map(([unit, series]) => (
            <AnalogChart
              key={unit}
              time={result.time}
              timeUnit={result.time_unit}
              series={series}
              colorOf={colorOf}
              cursor={cursorIndex}
            />
          ))}
          {digital.length > 0 && (
            <TimingDiagram
              time={result.time}
              timeUnit={result.time_unit}
              series={digital}
              colorOf={colorOf}
              cursor={cursorIndex}
            />
          )}
        </>
      )}
    </div>
  );
}
