import { usePcb } from "./PcbContext";

const ICON: Record<string, string> = { clearance: "!", short: "⚡", overlap: "!", unrouted: "..." };

export function DrcPanel() {
  const { drc } = usePcb();
  if (drc.length === 0) {
    return <div className="drc-panel drc-panel--clean">Board passes design-rule checks</div>;
  }
  return (
    <ul className="drc-panel" aria-label="Design rule violations">
      {drc.map((violation) => (
        <li key={violation.id} className={`drc-panel__item drc-panel__item--${violation.kind}`}>
          <span className="drc-panel__badge" aria-hidden>
            {ICON[violation.kind] ?? "!"}
          </span>
          {violation.message}
        </li>
      ))}
    </ul>
  );
}
