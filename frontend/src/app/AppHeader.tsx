import { SHORTCUTS_EVENT } from "../features/shortcuts/ShortcutsCheatsheet";

export function AppHeader() {
  return (
    <header className="app__header">
      <span className="app__logo" aria-hidden>
        ⚡
      </span>
      <span className="app__name">CircuitSim</span>
      <span className="app__tag">Wire real parts, flash firmware, watch it run</span>
      <span className="app__credit">Made by Enjoys · v{__APP_VERSION__}</span>
      <button
        type="button"
        className="app__help"
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
        onClick={() => window.dispatchEvent(new Event(SHORTCUTS_EVENT))}
      >
        ?
      </button>
    </header>
  );
}
