import type { SimulationOutput } from "../../domain";
import { formatValue } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { EmptyState } from "../../shared/ui/EmptyState";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";

interface Props {
  result: SimulationOutput | null;
  error: string | null;
}

export function OverviewPanel({ result, error }: Props) {
  const { runAssistant } = useWorkspaceUi();
  if (error) {
    return (
      <div className="overview">
        <p className="notice notice--critical" role="alert">
          <span aria-hidden>⛔</span>
          <strong>Simulation failed</strong> {error}
        </p>
      </div>
    );
  }
  if (!result) {
    return <EmptyState title="No results yet">Build a circuit and it will simulate automatically in Live mode.</EmptyState>;
  }

  return (
    <div className="overview">
      {result.warnings.map((warning) => (
        <p key={warning} className="notice notice--warning">
          <span aria-hidden>⚠</span>
          <strong>Warning</strong> {warning}
        </p>
      ))}
      {result.summary.length === 0 && result.warnings.length === 0 && (
        <p className="overview__muted">Circuit solved with no warnings.</p>
      )}
      <div className="overview__ai">
        <Button size="sm" onClick={() => runAssistant("explain")}>
          ✦ Explain circuit
        </Button>
        {result.warnings.length > 0 && (
          <Button size="sm" variant="primary" onClick={() => runAssistant("fix", result.warnings)}>
            Fix {result.warnings.length} with AI
          </Button>
        )}
      </div>
      <div className="stat-grid">
        {result.summary.map((item) => (
          <div key={item.label} className="stat">
            <span className="stat__label">{item.label}</span>
            <span className="stat__value">{formatValue(item.value, item.unit)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
