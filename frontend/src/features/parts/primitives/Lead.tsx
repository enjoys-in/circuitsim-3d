interface Props {
  points: string;
}

export function Lead({ points }: Props) {
  return (
    <g className="lead">
      <polyline points={points} className="lead__core" />
      <polyline points={points} className="lead__shine" />
    </g>
  );
}
