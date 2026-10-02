import { useMemo, useState } from "react";
import { formatSI, toNumber } from "../../../shared/lib/format";
import { Button } from "../../../shared/ui/Button";
import { useCircuitActions } from "../../board/CircuitGraphContext";
import type { PartNodeType } from "../../board/nodes/types";
import { useCatalog } from "../../catalog/CatalogContext";
import { ledSeriesResistor, ledVf, resistorColorCode } from "./calculators";

export function CalculatorSection({ node }: { node: PartNodeType }) {
  const { def, params } = node.data;
  if (def.key === "resistor") return <ResistorCalc ohms={toNumber(params.resistance, 0)} />;
  if (def.key === "led") return <LedCalc node={node} />;
  return null;
}

function ResistorCalc({ ohms }: { ohms: number }) {
  const code = useMemo(() => resistorColorCode(ohms), [ohms]);
  return (
    <section className="inspector__section">
      <h4 className="panel-heading">Color code</h4>
      {code ? (
        <div className="calc">
          <svg className="calc__resistor" viewBox="0 0 220 70" role="img" aria-label="Resistor color bands">
            <line x1="6" y1="35" x2="214" y2="35" stroke="var(--border)" strokeWidth="3" />
            <rect x="60" y="16" width="100" height="38" rx="9" fill="#c9b27a" stroke="#9c8a55" />
            {code.bands.map((band, i) => (
              <rect key={i} x={74 + i * 22} y="16" width="11" height="38" fill={band.hex} />
            ))}
          </svg>
          <div className="calc__field">
            <span>Value</span>
            <b>{code.text}</b>
          </div>
          <div className="calc__field">
            <span>Bands</span>
            <b>{code.bands.map((b) => b.name).join(" · ")}</b>
          </div>
        </div>
      ) : (
        <p className="inspector__muted">No standard 4-band code for {formatSI(ohms, "Ω")}.</p>
      )}
    </section>
  );
}

function LedCalc({ node }: { node: PartNodeType }) {
  const { params } = node.data;
  const { byKey } = useCatalog();
  const { addPart } = useCircuitActions();
  const [supply, setSupply] = useState(5);
  const [vf, setVf] = useState(() => ledVf(params.color));
  const [current, setCurrent] = useState(() => Math.round(toNumber(params.max_current, 0.02) * 1000));

  const result = useMemo(() => ledSeriesResistor(supply, vf, current / 1000), [supply, vf, current]);
  const resistorDef = byKey.get("resistor");

  const insert = () => {
    if (!result || !resistorDef) return;
    addPart(resistorDef, {
      params: { resistance: result.e12 },
      position: { x: node.position.x - 150, y: node.position.y },
    });
  };

  return (
    <section className="inspector__section">
      <h4 className="panel-heading">LED series resistor</h4>
      <div className="calc">
        <label className="calc__input">
          <span>Supply (V)</span>
          <input type="number" min="0" step="0.1" value={supply} onChange={(e) => setSupply(Number(e.target.value))} />
        </label>
        <label className="calc__input">
          <span>LED Vf (V)</span>
          <input type="number" min="0" step="0.1" value={vf} onChange={(e) => setVf(Number(e.target.value))} />
        </label>
        <label className="calc__input">
          <span>Current (mA)</span>
          <input type="number" min="0" step="1" value={current} onChange={(e) => setCurrent(Number(e.target.value))} />
        </label>
        {result ? (
          <>
            <div className="calc__field">
              <span>R = ({supply} − {vf}) / {current}mA</span>
              <b>{formatSI(result.resistor, "Ω")}</b>
            </div>
            <div className="calc__field calc__field--accent">
              <span>Nearest E12</span>
              <b>{formatSI(result.e12, "Ω")} · {formatSI(result.power, "W")}</b>
            </div>
            <Button size="sm" variant="primary" disabled={!resistorDef} onClick={insert} title="Add this resistor to the board">
              Insert {formatSI(result.e12, "Ω")} resistor
            </Button>
          </>
        ) : (
          <p className="inspector__muted">Supply must exceed the LED forward voltage.</p>
        )}
      </div>
    </section>
  );
}
