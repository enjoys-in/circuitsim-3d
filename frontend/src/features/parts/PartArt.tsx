import { memo } from "react";
import type { ComponentDef, InstanceState, Params } from "../../domain";
import { getPart } from "./registry";

interface Props {
  def: ComponentDef;
  params: Params;
  state?: InstanceState;
}

function PartArtImpl({ def, params, state }: Props) {
  const { width, height, Art } = getPart(def);
  return (
    <svg className="part-art" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Art def={def} params={params} state={state} />
    </svg>
  );
}

export const PartArt = memo(PartArtImpl);
