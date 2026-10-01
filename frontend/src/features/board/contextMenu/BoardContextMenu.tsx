import { useEffect, type ReactNode } from "react";
import { useCircuitActions, useCircuitGraph } from "../CircuitGraphContext";
import type { MenuState } from "./useContextMenu";

interface Props {
  menu: MenuState;
  onClose: () => void;
}

interface Item {
  label: string;
  shortcut?: string;
  danger?: boolean;
  run: () => void;
}

function useItems(menu: MenuState): Item[] {
  const actions = useCircuitActions();
  const { hasClipboard } = useCircuitGraph();

  if (menu.kind === "node") {
    return [
      { label: "Duplicate", shortcut: "Ctrl+D", run: () => actions.duplicateNode(menu.id) },
      { label: "Copy", shortcut: "Ctrl+C", run: () => actions.copyNode(menu.id) },
      { label: "Delete", shortcut: "Del", danger: true, run: () => actions.removeNode(menu.id) },
    ];
  }
  if (menu.kind === "edge") {
    return [{ label: "Delete wire", shortcut: "Del", danger: true, run: () => actions.removeEdge(menu.id) }];
  }
  return [
    ...(hasClipboard ? [{ label: "Paste", shortcut: "Ctrl+V", run: () => actions.pasteAt(menu.flow) }] : []),
    { label: "Clear board", danger: true, run: () => actions.clear() },
  ];
}

export function BoardContextMenu({ menu, onClose }: Props): ReactNode {
  const items = useItems(menu);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="context-menu__backdrop" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <ul className="context-menu" style={{ left: menu.x, top: menu.y }} role="menu">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              role="menuitem"
              className={item.danger ? "context-menu__item context-menu__item--danger" : "context-menu__item"}
              onClick={() => {
                item.run();
                onClose();
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
