import type { ComponentDef, Params, Position } from "../../../domain";
import type { PartNodeType } from "../nodes/types";

interface CreateArgs {
  id: string;
  def: ComponentDef;
  position: Position;
  label: string;
  params?: Params;
}

export function createPartNode({ id, def, position, label, params }: CreateArgs): PartNodeType {
  return {
    id,
    type: "part",
    position,
    data: { def, label, params: { ...def.default_params, ...params } },
  };
}
