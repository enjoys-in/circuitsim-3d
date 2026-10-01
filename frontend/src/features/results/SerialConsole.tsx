import { useEffect, useRef } from "react";
import type { LogEntry } from "../../domain";
import { EmptyState } from "../../shared/ui/EmptyState";

interface Props {
  log: LogEntry[];
}

export function SerialConsole({ log }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  if (log.length === 0) {
    return <EmptyState title="Serial monitor is empty">Call print(...) from board firmware to log here.</EmptyState>;
  }

  return (
    <div className="serial" role="log">
      {log.map((entry, i) => (
        <div key={i} className="serial__line">
          <span className="serial__time">{entry.t.toFixed(2)}s</span>
          <span className="serial__source">{entry.source}</span>
          <span className="serial__text">{entry.text}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
