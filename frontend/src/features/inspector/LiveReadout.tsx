import type { InstanceState } from "../../domain";
import { formatSI, formatValue, humanize } from "../../shared/lib/format";

const UNITS: Partial<Record<keyof InstanceState, string>> = { current: "A", voltage: "V", power: "W" };
const SCALARS: (keyof InstanceState)[] = ["on", "current", "voltage", "power", "region", "value", "q"];

export function LiveReadout({ state }: { state?: InstanceState }) {
  if (!state) return <p className="inspector__muted">Run a simulation to see live values.</p>;
  const rows = SCALARS.filter((key) => state[key] !== undefined && state[key] !== null).map((key) => {
    const value = state[key];
    const text = typeof value === "number" && UNITS[key] ? formatSI(value, UNITS[key]) : formatValue(value);
    return [humanize(key), text] as const;
  });
  const readings = Object.entries(state.readings ?? {});
  const pins = Object.entries(state.pins ?? {});

  return (
    <dl className="readout">
      {rows.map(([label, text]) => (
        <div key={label} className="readout__row">
          <dt>{label}</dt>
          <dd>{text}</dd>
        </div>
      ))}
      {readings.map(([name, value]) => (
        <div key={name} className="readout__row">
          <dt>{humanize(name)}</dt>
          <dd>{formatValue(value)}</dd>
        </div>
      ))}
      {pins.length > 0 && (
        <div className="readout__row readout__row--pins">
          <dt>GPIO</dt>
          <dd>
            {pins.map(([pin, level]) => (
              <span key={pin} className={level ? "pin-chip pin-chip--high" : "pin-chip"}>
                {pin}
              </span>
            ))}
          </dd>
        </div>
      )}
      {state.burnt && <p className="inspector__warning">This LED is burning out: too much current.</p>}
    </dl>
  );
}
