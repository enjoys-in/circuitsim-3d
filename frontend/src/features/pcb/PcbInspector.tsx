import { useMemo } from "react";
import { useCatalog } from "../catalog/CatalogContext";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { cx } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { NumberInput } from "../../shared/ui/NumberInput";
import { getFootprint } from "./model/footprints";
import { fromMm, padId, RECT_PAD, ROUND_PAD, toMm } from "./model/pcbTypes";
import { usePcb } from "./PcbContext";

const VALUE_KEYS = ["resistance", "capacitance", "inductance", "voltage", "value", "color", "max_current"];
function valueOf(def: { default_params: Record<string, unknown> }, params: Record<string, unknown>): string {
  for (const key of VALUE_KEYS) {
    const v = params[key] ?? def.default_params[key];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "";
}

export function PcbInspector() {
  const pcb = usePcb();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();

  const inst = pcb.selectedId ? circuit.instances.find((i) => i.id === pcb.selectedId) : undefined;
  const def = inst ? byKey.get(inst.component_key) : undefined;
  const placement = inst ? pcb.placements.get(inst.id) : undefined;
  const footprint = def ? getFootprint(def) : null;
  const netOf = new Map(pcb.pads.map((p) => [p.id, p.netId]));

  // Human-readable net list: which component pins each wire joins.
  const labelOf = new Map(circuit.instances.map((i) => [i.id, i.label || i.id]));
  const connections = circuit.nets
    .filter((n) => !n.id.startsWith("bb:"))
    .map((n) => ({
      id: n.id,
      netId: n.endpoints.map((ep) => netOf.get(ep)).find((v): v is string => Boolean(v)) ?? null,
      pins: n.endpoints.map((ep) => {
        const [iid, pin] = ep.split(":");
        return { label: labelOf.get(iid) ?? iid, pin: pin ?? "" };
      }),
    }));

  const partScale = placement?.padScale ?? 1;
  const bom = useMemo(() => {
    const groups = new Map<string, { name: string; value: string; items: { id: string; label: string }[] }>();
    for (const i of circuit.instances) {
      const d = byKey.get(i.component_key);
      if (!d) continue;
      const value = valueOf(d, i.params);
      const key = `${d.name}|${value}`;
      const group = groups.get(key) ?? { name: d.name, value, items: [] };
      group.items.push({ id: i.id, label: i.label || i.id });
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [circuit, byKey]);
  const selectedPad =
    footprint && placement && pcb.selectedPadId
      ? footprint.pads.find((p) => padId(inst!.id, p.name) === pcb.selectedPadId)
      : undefined;
  const padOverride = selectedPad ? placement?.pads?.[selectedPad.name] : undefined;
  const padBase = selectedPad ? (selectedPad.shape === "round" ? ROUND_PAD : RECT_PAD) : RECT_PAD;
  const padW = padOverride?.w ?? padBase * partScale;
  const padH = padOverride?.h ?? padBase * partScale;

  return (
    <div className="pcb-inspector">
      <section className="pcb-inspector__block">
        <h3>Board</h3>
        <div className="pcb-inspector__row">
          <NumberInput
            label="Width"
            suffix="mm"
            value={toMm(pcb.board.width)}
            min={10}
            max={400}
            step={1}
            onCommit={(v) => pcb.resizeBoard({ width: fromMm(v) })}
          />
          <NumberInput
            label="Height"
            suffix="mm"
            value={toMm(pcb.board.height)}
            min={10}
            max={400}
            step={1}
            onCommit={(v) => pcb.resizeBoard({ height: fromMm(v) })}
          />
        </div>
      </section>

      {bom.length > 0 && (
        <section className="pcb-inspector__block">
          <h3>Bill of materials</h3>
          <div className="pcb-bom">
            {bom.map((group) => (
              <div key={`${group.name}|${group.value}`} className="pcb-bom__row">
                <div className="pcb-bom__head">
                  <span className="pcb-bom__qty">{group.items.length}×</span>
                  <span className="pcb-bom__name">{group.name}</span>
                  {group.value && <span className="pcb-bom__value">{group.value}</span>}
                </div>
                <div className="pcb-bom__refs">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cx("pcb-bom__ref", pcb.selectedId === item.id && "pcb-bom__ref--on")}
                      onClick={() => pcb.selectComponent(item.id)}
                      title="Highlight this part on the board"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {inst && def && placement && footprint ? (
        <>
          <section className="pcb-inspector__block">
            <h3>{inst.label}</h3>
            <p className="pcb-inspector__sub">{def.name}</p>
            <div className="pcb-inspector__row">
              <Button size="sm" onClick={() => pcb.rotateComponent(inst.id)}>
                ⟳ Rotate
              </Button>
              <Button size="sm" onClick={() => pcb.flipComponent(inst.id)}>
                ⇋ Flip
              </Button>
              <span className="pcb-inspector__meta">
                {placement.rotation}° · {placement.side}
              </span>
            </div>
            <div className="pcb-inspector__row">
              <NumberInput
                label="Body W"
                suffix="mm"
                value={toMm(placement.bodyW ?? footprint.width)}
                min={3}
                max={120}
                step={0.5}
                onCommit={(v) => pcb.setBodySize(inst.id, { w: fromMm(v) })}
              />
              <NumberInput
                label="Body H"
                suffix="mm"
                value={toMm(placement.bodyH ?? footprint.height)}
                min={3}
                max={120}
                step={0.5}
                onCommit={(v) => pcb.setBodySize(inst.id, { h: fromMm(v) })}
              />
            </div>
            <div className="pcb-inspector__row">
              <NumberInput
                label="All pads"
                suffix="%"
                value={Math.round(partScale * 100)}
                min={50}
                max={250}
                step={10}
                onCommit={(v) => pcb.setPadScale(inst.id, v / 100)}
              />
              <Button size="sm" onClick={() => pcb.rotatePads(inst.id)} title="Turn every pad 90°">
                ⤵ Turn pads
              </Button>
            </div>
          </section>

          <section className="pcb-inspector__block">
            <h3>Pads</h3>
            <ul className="pcb-pad-list">
              {footprint.pads.map((pad) => {
                const id = padId(inst.id, pad.name);
                const net = netOf.get(id);
                return (
                  <li key={pad.name}>
                    <button
                      type="button"
                      className={cx("pcb-pad-row", pcb.selectedPadId === id && "pcb-pad-row--active")}
                      onClick={() => pcb.selectPad(pcb.selectedPadId === id ? null : id)}
                    >
                      <span className="pcb-pad-row__name">{pad.name}</span>
                      <span className="pcb-pad-row__shape">{pad.shape}</span>
                      <span className="pcb-pad-row__net">{net ? "net" : "—"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selectedPad ? (
              <div className="pcb-inspector__padcfg">
                <p className="pcb-inspector__sub">Pad {selectedPad.name}</p>
                <div className="pcb-inspector__row">
                  <NumberInput
                    label="Width"
                    suffix="mm"
                    value={toMm(padW)}
                    min={0.5}
                    max={12}
                    step={0.5}
                    onCommit={(v) => pcb.setPadBox(inst.id, selectedPad.name, { w: fromMm(v) })}
                  />
                  <NumberInput
                    label="Height"
                    suffix="mm"
                    value={toMm(padH)}
                    min={0.5}
                    max={12}
                    step={0.5}
                    onCommit={(v) => pcb.setPadBox(inst.id, selectedPad.name, { h: fromMm(v) })}
                  />
                </div>
                <div className="pcb-inspector__row">
                  <Button size="sm" onClick={() => pcb.turnPad(inst.id, selectedPad.name)}>
                    ⤵ Turn pad
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => pcb.setPadBox(inst.id, selectedPad.name, { w: undefined, h: undefined, angle: undefined })}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              <p className="pcb-inspector__hint">Pick a pad to set its width, height and rotation.</p>
            )}
          </section>
        </>
      ) : (
        <p className="pcb-inspector__hint">Select a part on the board to edit it, or drag parts from the library.</p>
      )}

      <section className="pcb-inspector__block">
        <h3>Connections{connections.length ? ` (${connections.length})` : ""}</h3>
        {connections.length === 0 ? (
          <p className="pcb-inspector__hint">No wires yet — wire parts in the schematic or route copper here.</p>
        ) : (
          <ul className="pcb-net-list">
            {connections.map((net) => (
              <li key={net.id}>
                <button
                  type="button"
                  className={cx("pcb-net", pcb.highlightedNetId === net.netId && net.netId && "pcb-net--active")}
                  onClick={() => pcb.highlightNet(pcb.highlightedNetId === net.netId ? null : net.netId)}
                  disabled={!net.netId}
                  title="Highlight this net on the board"
                >
                  {net.pins.map((p, i) => (
                    <span key={i} className="pcb-net__pin">
                      {i > 0 && <span className="pcb-net__sep">↔</span>}
                      <b>{p.label}</b>
                      <span className="pcb-net__dot">.{p.pin}</span>
                    </span>
                  ))}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
