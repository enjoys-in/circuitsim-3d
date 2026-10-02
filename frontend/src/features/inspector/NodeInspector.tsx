import { useMemo, useState } from "react";
import { cx } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/Field";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";
import { useHighlight } from "../board/HighlightContext";
import type { PartNodeType } from "../board/nodes/types";
import { usePresets } from "../presets/PresetsContext";
import { useLiveInstance } from "../simulation/SimulationContext";
import { LiveReadout } from "./LiveReadout";
import { ParamEditor } from "./ParamEditor";
import { describeParams } from "./paramSchema";
import { CalculatorSection } from "./calculators/CalculatorSection";

export function NodeInspector({ node }: { node: PartNodeType }) {
  const { def, label, params } = node.data;
  const { updateParams, setLabel, removeNode, rotateNode, flipNode } = useCircuitActions();
  const { nodes, edges } = useCircuitGraph();
  const { highlightPin } = useHighlight();
  const { addPreset } = usePresets();
  const state = useLiveInstance(node.id);
  const descriptors = useMemo(() => describeParams(def, params), [def, params]);
  const [naming, setNaming] = useState(false);
  const [presetName, setPresetName] = useState("");
  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;

  // Map each pin to the wire(s) attached to it, so a connected pin shows its wire colour.
  const wiredPins = useMemo(() => {
    const map = new Map<string, { color: string; to: string[] }>();
    for (const edge of edges) {
      const ends: [string | null | undefined, string | null | undefined, string, string][] = [
        [edge.source, edge.sourceHandle, edge.target, edge.targetHandle ?? ""],
        [edge.target, edge.targetHandle, edge.source, edge.sourceHandle ?? ""],
      ];
      for (const [nid, handle, otherId, otherHandle] of ends) {
        if (nid !== node.id || !handle) continue;
        const entry = map.get(handle) ?? { color: edge.data?.color ?? "#22c55e", to: [] };
        entry.to.push(`${labelOf(otherId as string)}.${otherHandle}`);
        map.set(handle, entry);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, node.id, nodes]);

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    addPreset({ name, baseKey: def.key, params: { ...params } });
    setNaming(false);
  };

  return (
    <div className="inspector__body">
      <header className="inspector__header">
        <div>
          <h3>{def.name}</h3>
          {def.description && <p className="inspector__muted">{def.description}</p>}
          {typeof def.default_params.product_url === "string" && (
            <a
              className="inspector__buy"
              href={def.default_params.product_url}
              target="_blank"
              rel="noreferrer noopener"
            >
              View on {String(def.default_params.vendor ?? "vendor")} ↗
            </a>
          )}
        </div>
        <span className="inspector__chip">{def.category.replace("_", " ")}</span>
      </header>

      <section className="inspector__section">
        <TextField label="Label" value={label} onCommit={(next) => setLabel(node.id, next.trim() || label)} />
        <div className="inspector__orient">
          <Button size="sm" onClick={() => rotateNode(node.id)} title="Rotate 90° (R)">
            ⟳ Rotate
          </Button>
          <Button size="sm" onClick={() => flipNode(node.id)} title="Flip horizontally (F)">
            ⇋ Flip
          </Button>
        </div>
        {descriptors.map((descriptor) => (
          <ParamEditor
            key={descriptor.key}
            descriptor={descriptor}
            value={params[descriptor.key]}
            state={state}
            onChange={(value) => updateParams(node.id, { [descriptor.key]: value })}
          />
        ))}
      </section>

      <CalculatorSection node={node} />

      <section className="inspector__section">
        <h4 className="panel-heading">Live</h4>
        <LiveReadout state={state} />
      </section>

      <section className="inspector__section">
        <h4 className="panel-heading">Pins</h4>
        <div className="inspector__pins">
          {def.pins.map((pin) => {
            const wired = wiredPins.get(pin.name);
            return (
              <button
                key={pin.name}
                type="button"
                className={cx("pin-chip", `pin-chip--${pin.direction}`, wired && "pin-chip--wired")}
                title={wired ? `${pin.direction} → ${wired.to.join(", ")}` : `${pin.direction} · unconnected`}
                style={wired ? { borderColor: wired.color } : undefined}
                onClick={() => highlightPin({ nodeId: node.id, pin: pin.name })}
              >
                {wired && <span className="pin-chip__dot" style={{ background: wired.color }} />}
                {pin.name}
              </button>
            );
          })}
        </div>
      </section>

      <div className="inspector__actions">
        {naming ? (
          <div className="inspector__save-preset">
            <input
              className="inspector__preset-name"
              value={presetName}
              autoFocus
              placeholder="My part name"
              aria-label="My part name"
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && savePreset()}
            />
            <Button variant="primary" size="sm" disabled={!presetName.trim()} onClick={savePreset}>
              Save
            </Button>
            <Button size="sm" onClick={() => setNaming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              setPresetName(label || def.name);
              setNaming(true);
            }}
            title="Save this part with its current values to My Parts"
          >
            Save as My Part
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={() => removeNode(node.id)}>
          Remove part
        </Button>
      </div>
    </div>
  );
}
