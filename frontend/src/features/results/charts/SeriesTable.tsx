import type { Series } from "../../../domain";
import { formatSI } from "../../../shared/lib/format";
import { formatTime } from "./timeFormat";

interface Props {
  time: number[];
  timeUnit: "s" | "tick";
  series: Series[];
}

const MAX_ROWS = 200;

export function SeriesTable({ time, timeUnit, series }: Props) {
  const stride = Math.max(1, Math.ceil(time.length / MAX_ROWS));
  const rows = time.map((t, i) => [t, i] as const).filter(([, i]) => i % stride === 0 || i === time.length - 1);

  return (
    <div className="series-table">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            {series.map((s) => (
              <th key={s.id}>{s.unit ? `${s.label} (${s.unit})` : s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([t, i]) => (
            <tr key={i}>
              <td>{formatTime(t, timeUnit)}</td>
              {series.map((s) => {
                const value = s.values[i];
                return (
                  <td key={s.id}>{value === null ? "—" : s.kind === "digital" ? value : formatSI(value, s.unit)}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
