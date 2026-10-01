import type { ButtonHTMLAttributes } from "react";
import { cx } from "../lib/format";

type Variant = "primary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export function Button({ variant = "ghost", size = "md", className, ...rest }: Props) {
  return <button type="button" className={cx("btn", `btn--${variant}`, `btn--${size}`, className)} {...rest} />;
}
