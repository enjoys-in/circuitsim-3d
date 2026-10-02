import { useEffect, useState } from "react";
import { Sheet } from "../../shared/ui/Sheet";
import "./shortcuts.css";

export const SHORTCUTS_EVENT = "circuitsim:toggle-shortcuts";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Schematic board",
    keys: [
      ["R", "Rotate the selected part"],
      ["F", "Flip the selected part"],
      [`${MOD} + C`, "Copy the selected part"],
      [`${MOD} + V`, "Paste at the cursor"],
      [`${MOD} + D`, "Duplicate the selected part"],
      ["Delete / Backspace", "Remove the selected part or wire"],
      ["Drag from palette", "Add a part to the board"],
    ],
  },
  {
    title: "PCB editor",
    keys: [
      ["R", "Rotate the selected footprint"],
      ["F", "Flip it to the other copper layer"],
    ],
  },
  {
    title: "AI assistant",
    keys: [
      ["/compact", "Clear the chat history to save tokens"],
      ["/help", "List the assistant commands"],
    ],
  },
  {
    title: "General",
    keys: [
      ["?", "Show or hide this cheatsheet"],
      ["Esc", "Close dialogs"],
    ],
  },
];

export function ShortcutsCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.matches?.("input, textarea, select")) return;
      if (e.key === "?") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(SHORTCUTS_EVENT, toggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(SHORTCUTS_EVENT, toggle);
    };
  }, []);

  return (
    <Sheet
      open={open}
      title="Keyboard shortcuts"
      onClose={() => setOpen(false)}
      actions={<span className="sheet__soon">press ?</span>}
    >
      <div className="shortcuts">
        {GROUPS.map((group) => (
          <section key={group.title} className="shortcuts__group">
            <h3 className="shortcuts__title">{group.title}</h3>
            <dl className="shortcuts__list">
              {group.keys.map(([key, desc]) => (
                <div key={key} className="shortcuts__row">
                  <dt>
                    <kbd className="shortcuts__key">{key}</kbd>
                  </dt>
                  <dd className="shortcuts__desc">{desc}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
