import { cx } from "../lib/format";

interface Props {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}

export function Skeleton({ width = "100%", height = 16, radius = 6, className }: Props) {
  return (
    <span
      className={cx("skeleton", className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  );
}
