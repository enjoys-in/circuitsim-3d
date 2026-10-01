import { memo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { cx } from "../../../shared/lib/format";
import { getPart, PartArt, type PartPin } from "../../parts";
import { useLiveInstance } from "../../simulation/SimulationContext";
import { useCircuitActions } from "../CircuitGraphContext";
import { useHighlight } from "../HighlightContext";
import type { PartNodeType } from "./types";

const SIDE: Record<PartPin["side"], Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

function PartNodeImpl({ id, data, selected }: NodeProps<PartNodeType>) {
  const spec = getPart(data.def);
  const state = useLiveInstance(id);
  const { interact } = useCircuitActions();
  const readout = spec.readout?.(data.params, state) ?? null;
  const updateNodeInternals = useUpdateNodeInternals();
  const { pin: highlighted } = useHighlight();
  const rotation = data.rotation ?? 0;
  const flip = data.flip ?? false;

  // React Flow caches pin positions; re-measure them after the symbol rotates/flips so
  // wires keep meeting the terminals.
  useEffect(() => updateNodeInternals(id), [id, rotation, flip, updateNodeInternals]);

  return (
    <div
      className={cx("part-node", selected && "part-node--selected", state?.fault && "part-node--fault")}
      style={{ width: spec.width, height: spec.height }}
    >
      <span className="part-node__label">{data.label}</span>
      <div
        className="part-node__rot"
        style={{ transform: `rotate(${rotation}deg) scaleX(${flip ? -1 : 1})` }}
      >
        <div className="part-node__art" onClick={spec.interact ? () => interact(id) : undefined}>
          <PartArt def={data.def} params={data.params} state={state} />
        </div>
        {spec.pins.map((pin) => (
          <Handle
            key={pin.name}
            id={pin.name}
            type="source"
            position={SIDE[pin.side]}
            className={cx("pin", highlighted?.nodeId === id && highlighted.pin === pin.name && "pin--highlight")}
            style={{ left: pin.x, top: pin.y, right: "auto", bottom: "auto", transform: "translate(-50%, -50%)" }}
            title={`${data.label}.${pin.name}`}
          />
        ))}
      </div>
      {readout && <span className="part-node__readout">{readout}</span>}
    </div>
  );
}

export const PartNode = memo(PartNodeImpl);
