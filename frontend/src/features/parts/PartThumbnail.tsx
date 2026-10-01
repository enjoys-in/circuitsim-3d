import type { ComponentDef, Params } from "../../domain";
import { getPart } from "./registry";

interface Props {
  def: ComponentDef;
  size?: number;
  params?: Params;
}

export default function PartThumbnail({ def, size = 52, params }: Props) {
  const { width, height, Art } = getPart(def);
  const pad = 6;
  return (
    <svg
      className="part-thumb"
      width={size}
      height={size}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <Art def={def} params={params ?? def.default_params} />
    </svg>
  );
}

