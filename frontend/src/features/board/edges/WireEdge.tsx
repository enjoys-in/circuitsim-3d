import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { formatSI } from "../../../shared/lib/format";
import { useLiveNet } from "../../simulation/SimulationContext";
import type { WireEdgeType } from "../nodes/types";

const DIGITAL_ENGINES = new Set(["digital"]);
const ENERGIZED_VOLTS = 0.5;

function describe(engine: string | null, value: number | null | undefined): { active: boolean; text: string | null } {
  if (value === undefined || value === null || engine === null) return { active: false, text: null };
  if (DIGITAL_ENGINES.has(engine)) return { active: value === 1, text: String(value) };
  return { active: value > ENERGIZED_VOLTS, text: formatSI(value, "V") };
}

function WireEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<WireEdgeType>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const { engine, value } = useLiveNet(id);
  const { active, text } = describe(engine, value);
  const color = data?.color ?? "#22c55e";

  return (
    <>
      <path d={path} className="wire__shadow" />
      <BaseEdge id={id} path={path} interactionWidth={18} style={{ stroke: color }} className="wire__body" />
      <path d={path} className="wire__shine" />
      {active && <path d={path} className="wire__flow" />}
      {selected && <path d={path} className="wire__selected" />}
      {text && (selected || active) && (
        <EdgeLabelRenderer>
          <span className="wire__label" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            {text}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const WireEdge = memo(WireEdgeImpl);
