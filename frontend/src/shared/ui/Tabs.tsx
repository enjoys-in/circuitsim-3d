import type { ReactNode } from "react";
import { cx } from "../lib/format";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  badge?: ReactNode;
}

interface Props<K extends string> {
  items: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  trailing?: ReactNode;
}

export function Tabs<K extends string>({ items, active, onChange, trailing }: Props<K>) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={item.key === active}
          className={cx("tabs__tab", item.key === active && "tabs__tab--active")}
          onClick={() => onChange(item.key)}
        >
          {item.label}
          {item.badge !== undefined && <span className="tabs__badge">{item.badge}</span>}
        </button>
      ))}
      {trailing && <div className="tabs__trailing">{trailing}</div>}
    </div>
  );
}
