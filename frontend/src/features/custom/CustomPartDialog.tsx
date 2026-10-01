import { useState } from "react";
import type { ComponentDef, PinDirection } from "../../domain";
import { Button } from "../../shared/ui/Button";
import { Sheet } from "../../shared/ui/Sheet";
import { useCustomComponents } from "./CustomComponentsContext";
import { CUSTOM_BASES } from "./customBases";
import "./custom.css";

interface PinRow {
  name: string;
  direction: PinDirection;
}

interface ValueRow {
  name: string;
  value: string;
}

const DIRECTIONS: PinDirection[] = ["input", "output", "bidirectional", "power", "ground", "passive"];
const RESERVED = new Set(["firmware", "color", "position", "mcu", "bus", "value", "pressed", "closed"]);

const uid = () => Math.random().toString(36).slice(2, 7);
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "part";

function coerce(v: string): number | string {
  const t = v.trim();
  return t !== "" && !Number.isNaN(Number(t)) ? Number(t) : t;
}

const DEFAULT_PINS: PinRow[] = [
  { name: "in", direction: "input" },
  { name: "out", direction: "output" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CustomPartDialog({ open, onClose }: Props) {
  const { addComponent } = useCustomComponents();
  const [name, setName] = useState("");
  const [behavior, setBehavior] = useState(""); // "" = label only, else a base key
  const [value, setValue] = useState("");
  const [pins, setPins] = useState<PinRow[]>(DEFAULT_PINS);
  const [values, setValues] = useState<ValueRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setBehavior("");
    setValue("");
    setPins(DEFAULT_PINS);
    setValues([]);
    setError(null);
  };

  const create = () => {
    const partName = name.trim();
    if (!partName) return setError("Give the part a name.");

    if (behavior) {
      const chosen = CUSTOM_BASES[behavior];
      const def: ComponentDef = {
        id: `custom:${uid()}`,
        key: `custom_${slug(partName)}_${uid()}`,
        name: partName,
        category: chosen.category,
        subcategory: "custom",
        description: `Custom ${chosen.label}`,
        pins: chosen.pins,
        default_params: { [chosen.param]: coerce(value.trim() || chosen.defaultValue) },
        spice_model: chosen.key,
        footprint: null,
        symbol: null,
        tags: ["custom"],
      };
      addComponent(def);
      reset();
      onClose();
      return;
    }

    const pinNames = pins.map((p) => p.name.trim()).filter(Boolean);
    if (pinNames.length === 0) return setError("Add at least one pin.");
    if (pinNames.some((n) => n.includes(":"))) return setError("Pin names can't contain ':'.");
    if (new Set(pinNames).size !== pinNames.length) return setError("Pin names must be unique.");
    const valueNames = values.map((v) => v.name.trim().toLowerCase()).filter(Boolean);
    if (new Set(valueNames).size !== valueNames.length) return setError("Value names must be unique.");
    if (valueNames.some((n) => RESERVED.has(n) || n.endsWith("_end")))
      return setError("A value name is reserved — pick another.");

    const def: ComponentDef = {
      id: `custom:${uid()}`,
      key: `custom_${slug(partName)}_${uid()}`,
      name: partName,
      category: "connector",
      subcategory: "custom",
      description: "Custom part",
      pins: pins
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), direction: p.direction, x: 0, y: 0 })),
      default_params: Object.fromEntries(
        values.filter((v) => v.name.trim()).map((v) => [v.name.trim(), coerce(v.value)]),
      ),
      spice_model: null,
      footprint: null,
      symbol: null,
      tags: ["custom"],
    };
    addComponent(def);
    reset();
    onClose();
  };

  const setPin = (i: number, patch: Partial<PinRow>) =>
    setPins((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setValueRow = (i: number, patch: Partial<ValueRow>) =>
    setValues((v) => v.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const base = behavior ? CUSTOM_BASES[behavior] : null;

  return (
    <Sheet
      open={open}
      title="Create a part"
      onClose={onClose}
      actions={
        <Button variant="primary" size="sm" onClick={create}>
          Create
        </Button>
      }
    >
      <div className="custom-form">
        <label className="custom-field">
          <span>Name</span>
          <input value={name} autoFocus placeholder="My sensor" onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="custom-field">
          <span>Behaves like</span>
          <select value={behavior} onChange={(e) => setBehavior(e.target.value)}>
            <option value="">Label only (no simulation)</option>
            {Object.entries(CUSTOM_BASES).map(([key, b]) => (
              <option key={key} value={key}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        {base ? (
          <>
            <label className="custom-field">
              <span>
                {base.valueLabel}
                {base.unit ? ` (${base.unit})` : ""}
              </span>
              <input value={value} placeholder={base.defaultValue} onChange={(e) => setValue(e.target.value)} />
            </label>
            <p className="custom-hint">
              Pins: {base.pins.map((p) => p.name).join(", ")} — simulates as a {base.label.toLowerCase()}.
            </p>
          </>
        ) : (
          <>
            <div className="custom-section">
              <div className="custom-section__head">
                <span>Pins</span>
                <Button size="sm" onClick={() => setPins((p) => [...p, { name: "", direction: "passive" }])}>
                  ＋ Pin
                </Button>
              </div>
              {pins.map((pin, i) => (
                <div className="custom-row" key={i}>
                  <input
                    className="custom-row__name"
                    value={pin.name}
                    placeholder="pin name"
                    onChange={(e) => setPin(i, { name: e.target.value })}
                  />
                  <select
                    value={pin.direction}
                    onChange={(e) => setPin(i, { direction: e.target.value as PinDirection })}
                  >
                    {DIRECTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="custom-row__del"
                    aria-label="Remove pin"
                    onClick={() => setPins((p) => p.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="custom-section">
              <div className="custom-section__head">
                <span>Values</span>
                <Button size="sm" onClick={() => setValues((v) => [...v, { name: "", value: "" }])}>
                  ＋ Value
                </Button>
              </div>
              {values.length === 0 && <p className="custom-hint">Optional — e.g. gain = 2, threshold = 1.5</p>}
              {values.map((val, i) => (
                <div className="custom-row" key={i}>
                  <input
                    className="custom-row__name"
                    value={val.name}
                    placeholder="name"
                    onChange={(e) => setValueRow(i, { name: e.target.value })}
                  />
                  <input
                    className="custom-row__val"
                    value={val.value}
                    placeholder="value"
                    onChange={(e) => setValueRow(i, { value: e.target.value })}
                  />
                  <button
                    type="button"
                    className="custom-row__del"
                    aria-label="Remove value"
                    onClick={() => setValues((v) => v.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {error && <p className="custom-error">{error}</p>}
      </div>
    </Sheet>
  );
}
